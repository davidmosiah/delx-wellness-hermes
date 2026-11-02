import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const runtime=fileURLToPath(new URL('../../',import.meta.url));
const harness=fileURLToPath(new URL('./',import.meta.url));
const permissionFlag=process.allowedNodeEnvironmentFlags.has('--permission') ? '--permission' : '--experimental-permission';
if (!process.allowedNodeEnvironmentFlags.has(permissionFlag)) throw new Error('Node permission support is required for this isolated test');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'hermes-real-entrypoints-'));
const results=[];
function snapshot(dir) {
 const entries=[];
 function walk(at) {
  for(const name of fs.readdirSync(at).sort()) {
   const p=path.join(at,name),s=fs.lstatSync(p),relative=path.relative(dir,p);
   if(s.isSymbolicLink()) entries.push([relative,'symlink',fs.readlinkSync(p)]);
   else if(s.isDirectory()) {entries.push([relative,'dir']);walk(p);}
   else entries.push([relative,'file',createHash('sha256').update(fs.readFileSync(p)).digest('hex')]);
  }
 }
 walk(dir);return entries;
}
function fixture(label) {
 const dir=fs.mkdtempSync(path.join(root,'case-'));
 const home=path.join(dir,'home'),profiles=path.join(home,'.hermes','profiles');
 fs.mkdirSync(path.join(profiles,'unrelated'),{recursive:true});
 fs.writeFileSync(path.join(home,'.hermes','config.yaml'),'model: default-sentinel\n');
 fs.writeFileSync(path.join(profiles,'unrelated','keep.txt'),'unrelated-sentinel');
 return {label,dir,home,profiles,profile:path.join(profiles,'safe')};
}
function run(f,operation,options={},cli=false) {
 const args=[permissionFlag,`--allow-fs-read=${runtime}`,`--allow-fs-read=${harness}`,`--allow-fs-read=${f.dir}`,`--allow-fs-write=${f.dir}`,'--import',path.join(harness,'deny-network.mjs')];
 if(cli) args.push(path.join(runtime,'bin/delx-wellness-hermes.js'),operation,'--profile',options.profileName,...(options.write?['--write']:[]));
 else args.push(path.join(harness,'api-driver.mjs'),operation,JSON.stringify({...options,packageRoot:runtime}));
 return spawnSync(process.execPath,args,{cwd:f.dir,env:{HOME:f.home,TMPDIR:f.dir,LANG:'C.UTF-8',PATH:''},encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
}
function reject(label,operation,options,prepare=()=>{},cli=false) {
 const f=fixture(label);prepare(f);const opts=typeof options==='function'?options(f):options;
 const before=snapshot(f.dir),res=run(f,operation,opts,cli);
 assert.equal(res.status,1,`${label}: expected controlled rejection: ${res.stderr}`);
 assert.match(res.stderr,/Invalid Hermes|Refusing|escaped/,`${label}: must reject in application, not sandbox`);
 assert.doesNotMatch(res.stderr,/ERR_ACCESS_DENIED|Offline harness/);
 assert.deepEqual(snapshot(f.dir),before,`${label}: filesystem changed on rejection`);
 results.push({label,status:'PASS'});
}
for(const op of ['install','uninstall']) {
 for(const name of ['.','..','../unrelated','a/b','a\\b','/absolute','line\nfeed','tab\tname']) {
  reject(`CLI ${op} profile ${JSON.stringify(name)}`,op,{profileName:name,write:true},undefined,true);
 }
 for(const name of ['', 'nul\0name','\u007f','\u2028','default']) {
  reject(`API ${op} profile ${JSON.stringify(name)}`,op,{profileName:name,write:true});
 }
 for(const which of ['HOME','default','case-root']) {
  reject(`API ${op} protected override ${which}`,op,f=>({profileName:'safe',hermesHome:which==='HOME'?f.home:which==='default'?path.join(f.home,'.hermes'):f.dir,write:true}));
 }
 reject(`CLI ${op} symlink profile leaf`,op,{profileName:'safe',write:true},f=>fs.symlinkSync(path.join(f.profiles,'unrelated'),f.profile,'dir'),true);
 reject(`CLI ${op} symlink profiles parent`,op,{profileName:'safe',write:true},f=>{fs.renameSync(f.profiles,path.join(f.home,'.hermes','relocated-profiles'));fs.symlinkSync('relocated-profiles',f.profiles,'dir');},true);
 for(const dangling of [false,true]) {
  reject(`CLI ${op} config symlink dangling=${dangling}`,op,{profileName:'safe',write:true},f=>{fs.mkdirSync(f.profile);fs.symlinkSync(path.join(f.home,'.hermes',dangling?'missing.yaml':'config.yaml'),path.join(f.profile,'config.yaml'));},true);
 }
 reject(`API ${op} override leaf symlink`,op,f=>({profileName:'safe',hermesHome:path.join(f.dir,'alias'),write:true}),f=>fs.symlinkSync(path.join(f.profiles,'unrelated'),path.join(f.dir,'alias'),'dir'));
}
for(const name of ['wellness-profile.json','SOUL.md','AGENTS.md','ONBOARDING.md','DAILY_OPERATOR.md']) {
 reject(`install symlink ${name}`,'install',{profileName:'safe',write:true},f=>{fs.mkdirSync(f.profile);fs.symlinkSync(path.join(f.profiles,'unrelated','keep.txt'),path.join(f.profile,name));},true);
}
for(const which of ['skills-parent','skills-leaf','explicit-skills']) {
 reject(`install ${which}`,'install',f=>({profileName:'safe',write:true,...(which==='explicit-skills'?{skillsDir:path.join(f.dir,'alias')}: {})}),f=>{
 fs.mkdirSync(f.profile);
 if(which==='skills-parent')fs.symlinkSync(path.join(f.profiles,'unrelated'),path.join(f.profile,'skills'),'dir');
 if(which==='skills-leaf'){fs.mkdirSync(path.join(f.profile,'skills'));fs.symlinkSync(path.join(f.profiles,'unrelated'),path.join(f.profile,'skills','delx-wellness'),'dir');}
 if(which==='explicit-skills')fs.symlinkSync(path.join(f.profiles,'unrelated'),path.join(f.dir,'alias'),'dir');
 });
}
for(const op of ['install','uninstall']) {
 reject(`API ${op} canonical default alias`,op,f=>({profileName:'safe',hermesHome:path.join(f.dir,'home-alias','.hermes'),write:true}),f=>fs.symlinkSync(f.home,path.join(f.dir,'home-alias'),'dir'));
 reject(`CLI ${op} dangling profile symlink`,op,{profileName:'safe',write:true},f=>fs.symlinkSync(path.join(f.dir,'missing-target'),f.profile,'dir'),true);
}
for(const which of ['HOME','default','case-root']) {
 reject(`API install protected skills override ${which}`,'install',f=>({profileName:'safe',skillsDir:which==='HOME'?f.home:which==='default'?path.join(f.home,'.hermes'):f.dir,write:true}));
}
// Positive controls exercise install dry-run and real uninstall backup/remove.
// Installer fs.cp write path is already covered by existing CI; its parent-stat
// implementation needs broader read permissions than this deliberately strict
// harness grants. Do not broaden reads merely to make that control pass.
for(const name of ['Meu perfil','健康','valid-name_1']) {
 const f=fixture(`positive CLI dry-install + write-uninstall ${name}`),beforeDefault=fs.readFileSync(path.join(f.home,'.hermes','config.yaml'),'utf8');
 const target=path.join(f.profiles,name);
 fs.mkdirSync(target);fs.writeFileSync(path.join(target,'config.yaml'),'model: fake-profile\n');
 const config=fs.readFileSync(path.join(target,'config.yaml'),'utf8');
 const beforeDry=snapshot(f.dir),installed=run(f,'install',{profileName:name,write:false},true);
 assert.equal(installed.status,0,installed.stderr);assert.deepEqual(snapshot(f.dir),beforeDry);
 const dry=run(f,'uninstall',{profileName:name,write:false},true);
 assert.equal(dry.status,0,dry.stderr);assert.deepEqual(snapshot(f.dir),beforeDry);
 const removed=run(f,'uninstall',{profileName:name,write:true},true);
 assert.equal(removed.status,0,removed.stderr);assert.equal(fs.existsSync(target),false);
 const backups=fs.readdirSync(f.profiles).filter(n=>n.startsWith(name+'.config.yaml.bak.'));
 assert.equal(backups.length,1);assert.equal(fs.readFileSync(path.join(f.profiles,backups[0]),'utf8'),config);
 assert.equal(fs.readFileSync(path.join(f.home,'.hermes','config.yaml'),'utf8'),beforeDefault);
 assert.equal(fs.readFileSync(path.join(f.profiles,'unrelated','keep.txt'),'utf8'),'unrelated-sentinel');
 results.push({label:f.label,status:'PASS'});
}
{
 const f=fixture('positive API custom dry-install + write-uninstall'),custom=path.join(f.dir,'custom-profile'),skills=path.join(f.dir,'custom-skills');
 fs.mkdirSync(custom);fs.writeFileSync(path.join(custom,'config.yaml'),'model: fake-custom\n');
 fs.mkdirSync(skills);fs.writeFileSync(path.join(skills,'keep.txt'),'caller-managed');
 const before=snapshot(f.dir),installed=run(f,'install',{profileName:'Meu perfil',hermesHome:custom,skillsDir:skills,write:false});
 assert.equal(installed.status,0,installed.stderr);assert.deepEqual(snapshot(f.dir),before);
 const removed=run(f,'uninstall',{profileName:'Meu perfil',hermesHome:custom,write:true});
 assert.equal(removed.status,0,removed.stderr);assert.equal(fs.existsSync(custom),false);assert.equal(fs.readFileSync(path.join(skills,'keep.txt'),'utf8'),'caller-managed');
 results.push({label:f.label,status:'PASS'});
}
const report={node:process.version,platform:process.platform,root,passed:results.length,results,notes:['Synthetic fixtures removed only after all checks pass','Child read/write permissions limited to snapshot/harness and per-case fake directory; clean HOME/PATH/env','Network preload denies sockets/DNS/fetch; no child-process permission in tested process']};
console.log(JSON.stringify(report));
// root is solely the fresh mkdtemp return above, never caller-controlled.
fs.rmSync(root,{recursive:true,force:true});
