import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { CONNECTOR_PRESETS } from "./connector-presets.js";
import { parseHermesConfig } from "./config-generator.js";
import { DEFAULT_PROFILE_NAME, resolveHermesHome, resolveProfileSkillsDir } from "./paths.js";

const execFileAsync = promisify(execFile);
const DEFAULT_HERMES_CHECK_TIMEOUT_MS = 30_000;
const CHAT_RUNTIME_TIMEOUT_MS = 90_000;
const MCP_SMOKE_TIMEOUT_MS = 120_000;

export type DoctorOptions = {
  profileName?: string;
  hermesHome?: string;
  skillsDir?: string;
  packageRoot?: string;
  runHermes?: boolean;
  hermesBinary?: string | undefined;
  testConnectors?: string[] | undefined;
  testChat?: boolean | undefined;
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
  connectorMode: string;
};

export async function doctorDelxWellnessHermesProfile(options: DoctorOptions = {}): Promise<DoctorReport> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  const hermesHome = options.hermesHome ?? resolveHermesHome(profileName);
  const configPath = path.join(hermesHome, "config.yaml");
  const expectedSkillsDir = options.skillsDir ?? resolveProfileSkillsDir(hermesHome);
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

  const wellnessProfileExists = await exists(path.join(hermesHome, "wellness-profile.json"));
  checks.push({
    id: "wellness_profile",
    ok: wellnessProfileExists,
    message: wellnessProfileExists ? "wellness-profile.json is installed" : "wellness-profile.json is missing"
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
    if (options.testChat) {
      checks.push(await runHermesCheck("hermes_chat_runtime", hermesBinary, [
        "-p",
        profileName,
        "-z",
        "Reply with exactly: delx-wellness-hermes-ok"
      ]));
    }
    for (const connector of options.testConnectors ?? []) {
      checks.push(await runHermesCheck(`hermes_mcp_test_${connector}`, hermesBinary, ["-p", profileName, "mcp", "test", connector]));
    }
  }

  const delxConfig = asPlainObject(config?.delx_wellness);
  const connectorMode = asString(delxConfig.connector_mode) ?? "full";
  const configuredServers = Object.keys(asPlainObject(config?.mcp_servers));
  const configuredConnectors = configuredServers.filter((id) => id !== "delx_wellness_hub");
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
  const expectedConnectors = configuredServers.includes("delx_wellness_hub")
    ? []
    : enabledDelxConnectors(delxConfig, defaultConnectors);
  const missingDefaultConnectors = expectedConnectors.filter((id) => !configuredConnectors.includes(id));
  checks.push({
    id: "mcp_connectors",
    ok: missingDefaultConnectors.length === 0,
    message: missingDefaultConnectors.length === 0
      ? connectorSummary(connectorMode, configuredServers, configuredConnectors)
      : `Missing default MCP connectors: ${missingDefaultConnectors.join(", ")}`
  });

  return {
    profileName,
    hermesHome,
    ready: checks.every((check) => check.ok),
    checks,
    configuredConnectors,
    missingDefaultConnectors,
    connectorMode
  };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push("Delx Wellness for Hermes doctor");
  lines.push("");
  lines.push(`Profile: ${report.profileName}`);
  lines.push(`Path: ${report.hermesHome}`);
  lines.push(`Result: ${report.ready ? "ready" : "needs attention"}`);
  lines.push("");

  lines.push("Checks:");
  for (const check of report.checks) {
    lines.push(`- ${check.ok ? "ok" : "needs attention"} ${check.id}: ${check.message}`);
  }

  const failing = report.checks.filter((check) => !check.ok);
  if (failing.length > 0) {
    lines.push("");
    lines.push("To fix:");
    const seen = new Set<string>();
    for (const check of failing) {
      const action = fixActionFor(check, report);
      if (seen.has(action)) continue;
      seen.add(action);
      lines.push(`- ${action}`);
    }
  } else {
    lines.push("");
    lines.push("Everything looks good. Start the agent with:");
    lines.push(`  hermes -p ${report.profileName}`);
  }

  return lines.join("\n");
}

function fixActionFor(check: DoctorCheck, report: DoctorReport): string {
  switch (check.id) {
    case "profile_home":
    case "soul":
    case "onboarding":
    case "wellness_profile":
    case "config":
      return `Profile files are missing or incomplete — run: npx -y delx-wellness-hermes setup --profile ${report.profileName}`;
    case "skills_external_dir":
      return `Skills directory is not registered — re-run setup: npx -y delx-wellness-hermes setup --profile ${report.profileName}`;
    case "mcp_connectors":
      return `Default MCP connectors are missing (${report.missingDefaultConnectors.join(", ") || "see above"}) — re-run setup with connectors: npx -y delx-wellness-hermes setup --profile ${report.profileName}`;
    case "hermes_version":
      return "Hermes binary did not respond to --version — install Hermes from https://github.com/NousResearch/hermes-agent (or pass --hermes <path>).";
    case "hermes_mcp_list":
      return `Hermes could not list MCP servers — check the install, then re-run: npx -y delx-wellness-hermes doctor --profile ${report.profileName} --run-hermes`;
    case "hermes_chat_runtime":
      return `No model/provider is configured for this profile — run: hermes -p ${report.profileName} model`;
    default:
      if (check.id.startsWith("hermes_mcp_test_")) {
        const connector = check.id.replace("hermes_mcp_test_", "");
        return `Connector smoke test failed for "${connector}" — connect its credentials through the connector's own setup flow, then re-run doctor.`;
      }
      return `${check.id}: ${check.message}`;
  }
}

async function runHermesCheck(id: string, command: string, args: string[]): Promise<DoctorCheck> {
  const timeout = hermesCheckTimeout(args);
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout, maxBuffer: 256_000 });
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
      message: formatCommandError(error, timeout)
    };
  }
}

function hermesCheckTimeout(args: string[]): number {
  if (args.includes("-z")) return CHAT_RUNTIME_TIMEOUT_MS;
  return args.includes("mcp") && args.includes("test") ? MCP_SMOKE_TIMEOUT_MS : DEFAULT_HERMES_CHECK_TIMEOUT_MS;
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

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function enabledDelxConnectors(delxConfig: Record<string, unknown>, fallback: string[]): string[] {
  const connectors = delxConfig.connectors;
  if (!Array.isArray(connectors)) return fallback;
  const enabled = connectors
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    .filter((item) => item.enabled === true)
    .map((item) => item.id)
    .filter((id): id is string => typeof id === "string");
  return enabled.length > 0 ? enabled : fallback;
}

function connectorSummary(connectorMode: string, configuredServers: string[], configuredConnectors: string[]): string {
  if (configuredServers.includes("delx_wellness_hub")) {
    return "Configured hosted Delx Wellness hub";
  }
  const label = connectorMode === "custom" ? "custom" : connectorMode === "lite" ? "lite" : "full";
  return `Configured ${label} MCP connectors: ${configuredConnectors.join(", ")}`;
}

function redactOutput(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(token|secret|password|api[_-]?key)=\S+/gi, "$1=[redacted]");
}

function formatCommandError(error: unknown, timeoutMs: number): string {
  const message = error instanceof Error ? error.message : String(error);
  const stderr = getStringProperty(error, "stderr");
  const stdout = getStringProperty(error, "stdout");
  const output = redactOutput(`${stdout}\n${stderr}`.trim() || message);
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const timedOut = getBooleanProperty(error, "killed") || /timed out|timeout|SIGTERM/i.test(message);
  if (timedOut) {
    const lastOutput = lines.length > 0 ? ` Last output: ${lines.slice(-3).join(" | ")}` : "";
    return `Command timed out after ${Math.round(timeoutMs / 1000)}s.${lastOutput}`;
  }
  const important = findLast(lines, (line) => /AuthError|Error:|No inference provider configured|not configured/i.test(line));
  if (important) return important;
  if (lines.length > 0) return lines.slice(-3).join(" | ");
  return redactOutput(message);
}

function getStringProperty(value: unknown, key: string): string {
  if (typeof value !== "object" || value === null || !(key in value)) return "";
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : "";
}

function getBooleanProperty(value: unknown, key: string): boolean {
  if (typeof value !== "object" || value === null || !(key in value)) return false;
  return (value as Record<string, unknown>)[key] === true;
}

function findLast<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item !== undefined && predicate(item)) return item;
  }
  return undefined;
}
