import fs from "node:fs/promises";
import path from "node:path";
import {
  BuildHermesProfileConfigOptions,
  buildHermesProfileConfig,
  mergeHermesConfig,
  parseHermesConfig,
  renderDryRunConfig,
  stringifyHermesConfig
} from "./config-generator.js";
import {
  DEFAULT_PROFILE_NAME,
  resolveHermesHome,
  resolvePackageSkillsDir,
  resolveProfileSkillsDir,
  resolvePackageTemplatePath
} from "./paths.js";
import { stringifyWellnessProfile } from "./wellness-profile.js";

export type InstallOptions = Omit<BuildHermesProfileConfigOptions, "skillsDir"> & {
  profileName?: string;
  hermesHome?: string;
  skillsDir?: string;
  packageRoot?: string;
  write?: boolean;
};

export type InstallResult = {
  profileName: string;
  hermesHome: string;
  configPath: string;
  dryRun: boolean;
  changedFiles: string[];
  renderedConfig: string;
};

export async function installDelxWellnessHermesProfile(options: InstallOptions = {}): Promise<InstallResult> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  if (profileName === "default" && options.write) {
    throw new Error("Refusing to write into the default Hermes profile. Use --profile delx-wellness.");
  }

  const hermesHome = options.hermesHome ?? resolveHermesHome(profileName);
  const configPath = path.join(hermesHome, "config.yaml");
  const wellnessProfilePath = path.join(hermesHome, "wellness-profile.json");
  const packageSkillsDir = resolvePackageSkillsDir(options.packageRoot);
  const skillsDir = options.skillsDir ?? resolveProfileSkillsDir(hermesHome);
  const generated = buildHermesProfileConfig({
    ...options,
    profileName,
    skillsDir
  });

  const existing = await readExistingConfig(configPath);
  const merged = mergeHermesConfig(existing, generated);
  const renderedConfig = options.write ? stringifyHermesConfig(merged) : renderDryRunConfig(merged);

  if (!options.write) {
    return {
      profileName,
      hermesHome,
      configPath,
      dryRun: true,
      changedFiles: [
        configPath,
        path.join(hermesHome, "SOUL.md"),
        path.join(hermesHome, "AGENTS.md"),
        path.join(hermesHome, "ONBOARDING.md"),
        wellnessProfilePath,
        skillsDir
      ],
      renderedConfig
    };
  }

  await fs.mkdir(hermesHome, { recursive: true });
  await backupIfExists(configPath);
  await fs.writeFile(configPath, renderedConfig, "utf8");

  const changedFiles = [configPath];
  if (!(await exists(wellnessProfilePath))) {
    await fs.writeFile(wellnessProfilePath, stringifyWellnessProfile(), "utf8");
    changedFiles.push(wellnessProfilePath);
  }

  await fs.rm(skillsDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(skillsDir), { recursive: true });
  await fs.cp(packageSkillsDir, skillsDir, { recursive: true });
  changedFiles.push(skillsDir);

  for (const templateName of ["SOUL.md", "AGENTS.md", "ONBOARDING.md", "DAILY_OPERATOR.md"] as const) {
    const destination = path.join(hermesHome, templateName);
    await backupIfExists(destination);
    await fs.copyFile(resolvePackageTemplatePath(templateName, options.packageRoot), destination);
    changedFiles.push(destination);
  }

  return {
    profileName,
    hermesHome,
    configPath,
    dryRun: false,
    changedFiles,
    renderedConfig: renderDryRunConfig(merged)
  };
}

async function readExistingConfig(configPath: string): Promise<Record<string, unknown>> {
  try {
    return parseHermesConfig(await fs.readFile(configPath, "utf8"));
  } catch (error) {
    if (isNotFound(error)) return {};
    throw error;
  }
}

async function backupIfExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (isNotFound(error)) return;
    throw error;
  }
  const backupPath = `${filePath}.bak.${new Date().toISOString().replace(/[:.]/g, "-")}`;
  await fs.copyFile(filePath, backupPath);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
