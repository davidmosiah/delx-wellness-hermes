import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PROFILE_NAME, resolveHermesHome } from "./paths.js";

export type UninstallOptions = {
  profileName?: string;
  hermesHome?: string;
  write?: boolean;
};

export type UninstallResult = {
  profileName: string;
  hermesHome: string;
  existed: boolean;
  dryRun: boolean;
  backupPath?: string;
  removedPaths: string[];
};

/**
 * Remove a Delx Wellness Hermes profile. The installer owns the whole
 * `~/.hermes/profiles/<name>/` directory, so uninstall backs up config.yaml
 * (the one file a user might have merged their own model/keys into) and then
 * removes the profile home. Writing into the default Hermes profile is refused,
 * mirroring the install guard. Without `write: true` this is a dry run.
 */
export async function uninstallDelxWellnessHermesProfile(options: UninstallOptions = {}): Promise<UninstallResult> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  if (profileName === "default") {
    throw new Error("Refusing to uninstall the default Hermes profile. Pass --profile delx-wellness.");
  }

  const hermesHome = options.hermesHome ?? resolveHermesHome(profileName);
  const configPath = path.join(hermesHome, "config.yaml");
  const existed = await exists(hermesHome);
  const dryRun = !options.write;

  if (!existed) {
    return { profileName, hermesHome, existed, dryRun, removedPaths: [] };
  }

  if (dryRun) {
    return { profileName, hermesHome, existed, dryRun, removedPaths: [hermesHome] };
  }

  const result: UninstallResult = {
    profileName,
    hermesHome,
    existed,
    dryRun,
    removedPaths: [hermesHome]
  };

  const backupPath = await backupConfig(configPath, hermesHome);
  if (backupPath) result.backupPath = backupPath;

  await fs.rm(hermesHome, { recursive: true, force: true });
  return result;
}

/**
 * Copy config.yaml to a sibling `<profile>.config.yaml.bak.<ts>` *outside* the
 * profile dir before we delete the dir, so the backup survives removal.
 */
async function backupConfig(configPath: string, hermesHome: string): Promise<string | undefined> {
  if (!(await exists(configPath))) return undefined;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(path.dirname(hermesHome), `${path.basename(hermesHome)}.config.yaml.bak.${stamp}`);
  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.copyFile(configPath, backupPath);
  return backupPath;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}
