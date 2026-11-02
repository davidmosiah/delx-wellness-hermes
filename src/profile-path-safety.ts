import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

/** Preserve ordinary Unicode/spaces: a profile is one segment, not a path. */
export function assertProfileName(value: string, platform: string = process.platform): void {
  if (typeof value !== "string" || value.length === 0 || value === "." || value === ".." || /[/\\\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)) {
    throw new Error("Invalid Hermes profile name: expected one non-empty path segment without controls.");
  }
  if (platform === "win32" && (/[<>:"|?*]/u.test(value) || /[. ]$/u.test(value) || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(value))) {
    throw new Error("Invalid Hermes profile name for Windows.");
  }
}

export async function assertNotSymlink(candidate: string): Promise<void> {
  try {
    if ((await fs.lstat(candidate)).isSymbolicLink()) throw new Error("Refusing a symlinked Hermes mutation target.");
  } catch (error) {
    if (!notFound(error)) throw error;
  }
}

function notFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

/** Resolve existing ancestors without requiring a new profile to exist. */
async function canonicalPath(input: string): Promise<string> {
  let current = path.resolve(input);
  const missing: string[] = [];
  while (true) {
    try { return path.join(await fs.realpath(current), ...missing); }
    catch (error) {
      if (!notFound(error)) throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.unshift(path.basename(current));
      current = parent;
    }
  }
}

function contains(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

/**
 * Default profiles stay below the canonical profiles directory. An explicit
 * hermesHome is trusted caller authority for a custom location (not a sandbox),
 * but may not alias/contain HOME or the default Hermes home. Existing leaf
 * symlinks are refused. Checks do not prevent concurrent same-UID path races.
 */
export async function assertSafeProfileMutation(profileName: string, target: string, explicitHome = false, homeDir = process.env.HOME || homedir()): Promise<void> {
  assertProfileName(profileName);
  if (profileName === "default") throw new Error("Refusing to modify the default Hermes profile.");
  if (!homeDir) throw new Error("HOME is required to validate Hermes profile paths");
  const absolute = path.resolve(target);
  const userHome = path.resolve(homeDir);
  const defaultHome = path.join(userHome, ".hermes");
  const profilesRoot = path.join(defaultHome, "profiles");
  if (!explicitHome && (path.relative(profilesRoot, absolute) !== profileName)) {
    throw new Error("Profile mutation escaped the named profiles directory.");
  }
  await assertNotSymlink(absolute);
  if (!explicitHome) await assertNotSymlink(profilesRoot);
  const [canonical, canonicalUser, canonicalDefault] = await Promise.all([canonicalPath(absolute), canonicalPath(userHome), canonicalPath(defaultHome)]);
  if (contains(absolute, userHome) || contains(absolute, defaultHome) || contains(canonical, canonicalUser) || contains(canonical, canonicalDefault)) {
    throw new Error("Refusing to modify HOME, the default Hermes home, or their ancestors.");
  }
  if (!explicitHome) {
    const canonicalProfiles = await canonicalPath(profilesRoot);
    if (path.relative(canonicalProfiles, canonical) !== profileName) throw new Error("Profile mutation escaped canonical containment.");
  }
}
