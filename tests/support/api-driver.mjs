import { installDelxWellnessHermesProfile } from '../../dist/install.js';
import { uninstallDelxWellnessHermesProfile } from '../../dist/uninstall.js';
try {
 const [operation,json] = process.argv.slice(2);
 const result=await (operation==='install'?installDelxWellnessHermesProfile:uninstallDelxWellnessHermesProfile)(JSON.parse(json));
 console.log(JSON.stringify(result));
} catch(error) {
 console.error(error.message, error.code ?? "", error.resource ?? "", error.stack ?? "");
 process.exitCode=1;
}
