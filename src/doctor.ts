import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { CONNECTOR_PRESETS } from "./connector-presets.js";
import { parseHermesConfig } from "./config-generator.js";
import { DEFAULT_PROFILE_NAME, resolveHermesHome, resolvePackageSkillsDir } from "./paths.js";

const execFileAsync = promisify(execFile);

export type DoctorOptions = {
  profileName?: string;
  hermesHome?: string;
  skillsDir?: string;
  packageRoot?: string;
  runHermes?: boolean;
  hermesBinary?: string | undefined;
  testConnectors?: string[] | undefined;
};

export type DoctorCheck = {
  id: string;
  ok: boolean;
  message: string;
};

export type DoctorReport = {
  profileName: string;
  hermesHome: string;
  ready: boolean;
  checks: DoctorCheck[];
  configuredConnectors: string[];
  missingDefaultConnectors: string[];
};

export async function doctorDelxWellnessHermesProfile(options: DoctorOptions = {}): Promise<DoctorReport> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  const hermesHome = options.hermesHome ?? resolveHermesHome(profileName);
  const configPath = path.join(hermesHome, "config.yaml");
  const expectedSkillsDir = options.skillsDir ?? resolvePackageSkillsDir(options.packageRoot);
  const checks: DoctorCheck[] = [];

  const profileExists = await exists(hermesHome);
  checks.push({
    id: "profile_home",
    ok: profileExists,
    message: profileExists ? `Hermes profile home exists at ${hermesHome}` : `Hermes profile home is missing at ${hermesHome}`
  });

  const soulExists = await exists(path.join(hermesHome, "SOUL.md"));
  checks.push({
    id: "soul",
    ok: soulExists,
    message: soulExists ? "SOUL.md is installed" : "SOUL.md is missing"
  });

  const onboardingExists = await exists(path.join(hermesHome, "ONBOARDING.md"));
  checks.push({
    id: "onboarding",
    ok: onboardingExists,
    message: onboardingExists ? "ONBOARDING.md is installed" : "ONBOARDING.md is missing"
  });

  const config = await readConfigIfPresent(configPath);
  checks.push({
    id: "config",
    ok: Boolean(config),
    message: config ? "config.yaml is readable" : "config.yaml is missing or unreadable"
  });

  if (options.runHermes) {
    const hermesBinary = options.hermesBinary ?? "hermes";
    checks.push(await runHermesCheck("hermes_version", hermesBinary, ["--version"]));
    checks.push(await runHermesCheck("hermes_mcp_list", hermesBinary, ["-p", profileName, "mcp", "list"]));
    for (const connector of options.testConnectors ?? []) {
      checks.push(await runHermesCheck(`hermes_mcp_test_${connector}`, hermesBinary, ["-p", profileName, "mcp", "test", connector]));
    }
  }

  const configuredConnectors = Object.keys(asPlainObject(config?.mcp_servers));
  const externalDirs = asStringArray(asPlainObject(config?.skills).external_dirs);
  checks.push({
    id: "skills_external_dir",
    ok: externalDirs.includes(expectedSkillsDir),
    message: externalDirs.includes(expectedSkillsDir)
      ? "Delx Wellness skills directory is registered"
      : `Delx Wellness skills directory is not registered: ${expectedSkillsDir}`
  });

  const defaultConnectors = CONNECTOR_PRESETS
    .filter((preset) => preset.enabledByDefault)
    .map((preset) => preset.id);
  const missingDefaultConnectors = defaultConnectors.filter((id) => !configuredConnectors.includes(id));
  checks.push({
    id: "mcp_connectors",
    ok: missingDefaultConnectors.length === 0,
    message: missingDefaultConnectors.length === 0
      ? "Default Delx Wellness MCP connectors are configured"
      : `Missing default MCP connectors: ${missingDefaultConnectors.join(", ")}`
  });

  return {
    profileName,
    hermesHome,
    ready: checks.every((check) => check.ok),
    checks,
    configuredConnectors,
    missingDefaultConnectors
  };
}

async function runHermesCheck(id: string, command: string, args: string[]): Promise<DoctorCheck> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 30_000, maxBuffer: 64_000 });
    const output = `${stdout}${stderr}`.trim();
    return {
      id,
      ok: true,
      message: output ? redactOutput(output).split("\n")[0] ?? `${command} ${args.join(" ")} passed` : `${command} ${args.join(" ")} passed`
    };
  } catch (error) {
    return {
      id,
      ok: false,
      message: redactOutput(error instanceof Error ? error.message : String(error))
    };
  }
}

async function readConfigIfPresent(configPath: string): Promise<Record<string, unknown> | undefined> {
  try {
    return parseHermesConfig(await fs.readFile(configPath, "utf8"));
  } catch {
    return undefined;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function asPlainObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function redactOutput(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(token|secret|password|api[_-]?key)=\S+/gi, "$1=[redacted]");
}
