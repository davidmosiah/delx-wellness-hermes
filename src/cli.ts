import { CONNECTOR_PRESETS, formatConnectorPresets, type ConnectorId } from "./connector-presets.js";
import { doctorDelxWellnessHermesProfile, formatDoctorReport } from "./doctor.js";
import { runDelxWellnessE2E } from "./e2e.js";
import { installDelxWellnessHermesProfile } from "./install.js";
import { createOnboardingFile, formatOnboardingQuestions } from "./onboarding.js";
import { formatSetupResult, setupDelxWellnessHermes } from "./setup.js";
import { uninstallDelxWellnessHermesProfile, type UninstallResult } from "./uninstall.js";
import type { DoctorReport } from "./doctor.js";
import type { WellnessLanguage } from "./wellness-profile.js";

type ParsedArgs = {
  command: string;
  options: Record<string, string | boolean>;
};

async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);

  if (parsed.command === "help" || parsed.command === "--help" || parsed.command === "-h") {
    printUsage();
    return;
  }

  if (parsed.command === "install") {
    const installOptions: Parameters<typeof installDelxWellnessHermesProfile>[0] = {
      profileName: stringOption(parsed.options.profile, "delx-wellness"),
      mode: parsed.options.mode === "hosted" ? "hosted" : "local",
      write: parsed.options.write === true
    };
    const hubUrl = stringOption(parsed.options["hub-url"], undefined);
    const connectorMode = connectorModeOption(parsed.options["connector-mode"]);
    const connectorIds = connectorIdsOption(parsed.options.connectors);
    if (hubUrl !== undefined) installOptions.hubUrl = hubUrl;
    if (connectorMode !== undefined) installOptions.connectorMode = connectorMode;
    if (connectorIds !== undefined) installOptions.connectorIds = connectorIds;
    const result = await installDelxWellnessHermesProfile(installOptions);
    console.log(JSON.stringify({
      profileName: result.profileName,
      hermesHome: result.hermesHome,
      configPath: result.configPath,
      dryRun: result.dryRun,
      changedFiles: result.changedFiles
    }, null, 2));
    console.log("--- redacted config preview ---");
    console.log(result.renderedConfig.trimEnd());
    return;
  }

  if (parsed.command === "setup") {
    const setupOptions: Parameters<typeof setupDelxWellnessHermes>[0] = {
      profileName: stringOption(parsed.options.profile, "delx-wellness"),
      mode: parsed.options.mode === "hosted" ? "hosted" : "local",
      dryRun: parsed.options["dry-run"] === true,
      skipSmoke: parsed.options["skip-smoke"] === true,
      testChat: parsed.options["test-chat"] === true
    };
    const hubUrl = stringOption(parsed.options["hub-url"], undefined);
    const hermesBinary = stringOption(parsed.options.hermes, undefined);
    const connectorMode = connectorModeOption(parsed.options["connector-mode"]);
    const connectorIds = connectorIdsOption(parsed.options.connectors);
    if (hubUrl !== undefined) setupOptions.hubUrl = hubUrl;
    if (hermesBinary !== undefined) setupOptions.hermesBinary = hermesBinary;
    if (connectorMode !== undefined) setupOptions.connectorMode = connectorMode;
    if (connectorIds !== undefined) setupOptions.connectorIds = connectorIds;
    const result = await setupDelxWellnessHermes(setupOptions);
    console.log(formatSetupResult(result));
    process.exitCode = result.doctor?.ready === false ? 1 : 0;
    return;
  }

  if (parsed.command === "doctor") {
    const doctorOptions: Parameters<typeof doctorDelxWellnessHermesProfile>[0] = {
      profileName: stringOption(parsed.options.profile, "delx-wellness"),
      runHermes: parsed.options["run-hermes"] === true,
      testChat: parsed.options["test-chat"] === true
    };
    const hermesBinary = stringOption(parsed.options.hermes, undefined);
    const testConnectors = stringListOption(parsed.options["test-connectors"]);
    if (hermesBinary !== undefined) doctorOptions.hermesBinary = hermesBinary;
    if (testConnectors !== undefined) doctorOptions.testConnectors = testConnectors;
    const report = await doctorDelxWellnessHermesProfile(doctorOptions);
    if (parsed.options.json === true) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatDoctorReport(report));
    }
    process.exitCode = report.ready ? 0 : 1;
    return;
  }

  if (parsed.command === "status") {
    const report = await doctorDelxWellnessHermesProfile({
      profileName: stringOption(parsed.options.profile, "delx-wellness")
    });
    if (parsed.options.json === true) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatStatusReport(report));
    }
    process.exitCode = report.ready ? 0 : 1;
    return;
  }

  if (parsed.command === "connectors" || parsed.command === "list") {
    if (parsed.options.json === true) {
      console.log(JSON.stringify(CONNECTOR_PRESETS, null, 2));
    } else {
      console.log(formatConnectorPresets());
    }
    return;
  }

  if (parsed.command === "uninstall") {
    const uninstallOptions: Parameters<typeof uninstallDelxWellnessHermesProfile>[0] = {
      profileName: stringOption(parsed.options.profile, "delx-wellness"),
      write: parsed.options.write === true
    };
    const result = await uninstallDelxWellnessHermesProfile(uninstallOptions);
    if (parsed.options.json === true) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatUninstallResult(result));
    }
    return;
  }

  if (parsed.command === "onboarding") {
    const language = languageOption(parsed.options.language);
    const onboardingOptions: Parameters<typeof createOnboardingFile>[0] = {
      profileName: stringOption(parsed.options.profile, "delx-wellness"),
      write: parsed.options.write === true
    };
    if (language !== undefined) onboardingOptions.language = language;
    const result = await createOnboardingFile(onboardingOptions);
    console.log(JSON.stringify({
      profileName: result.profileName,
      hermesHome: result.hermesHome,
      onboardingPath: result.onboardingPath,
      wellnessProfilePath: result.wellnessProfilePath,
      written: result.written
    }, null, 2));
    console.log("--- onboarding questions ---");
    const formatOptions: Parameters<typeof formatOnboardingQuestions>[1] = {};
    if (language !== undefined) formatOptions.language = language;
    console.log(formatOnboardingQuestions(result.questions, formatOptions));
    return;
  }

  if (parsed.command === "e2e") {
    const e2eOptions: Parameters<typeof runDelxWellnessE2E>[0] = {
      profileName: stringOption(parsed.options.profile, "delx-wellness")
    };
    const hermesBinary = stringOption(parsed.options.hermes, undefined);
    const promptFile = stringOption(parsed.options["prompt-file"], undefined);
    const testConnectors = stringListOption(parsed.options["test-connectors"]);
    const timeoutMs = numberOption(parsed.options["timeout-ms"]);
    if (hermesBinary !== undefined) e2eOptions.hermesBinary = hermesBinary;
    if (promptFile !== undefined) e2eOptions.promptFile = promptFile;
    if (testConnectors !== undefined) e2eOptions.testConnectors = testConnectors;
    if (timeoutMs !== undefined) e2eOptions.timeoutMs = timeoutMs;
    const report = await runDelxWellnessE2E(e2eOptions);
    if (parsed.options.json === true) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatDoctorReport(report.doctor));
      console.log("");
      console.log(`End-to-end: ${report.ready ? "ready" : "needs attention"}`);
      if (report.error) console.log(`Last error: ${report.error}`);
      console.log("");
      console.log("--- agent response (redacted) ---");
      console.log(report.response.trim() || "(no response captured)");
    }
    process.exitCode = report.ready ? 0 : 1;
    return;
  }

  console.error(`Unknown command: ${parsed.command}`);
  console.error("");
  printUsage();
  process.exitCode = 1;
}

const BOOLEAN_FLAGS = new Set([
  "write",
  "dry-run",
  "json",
  "run-hermes",
  "test-chat",
  "skip-smoke"
]);

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg?.startsWith("--")) continue;
    const key = arg.slice(2);
    // Known boolean flags are simply `true` when present — no value consumed.
    if (BOOLEAN_FLAGS.has(key)) {
      options[key] = true;
      continue;
    }
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = value;
    index += 1;
  }

  return { command, options };
}

function stringOption(value: string | boolean | undefined, fallback: string): string;
function stringOption(value: string | boolean | undefined, fallback: string | undefined): string | undefined;
function stringOption(value: string | boolean | undefined, fallback: string | undefined): string | undefined {
  return typeof value === "string" ? value : fallback;
}

function connectorModeOption(value: string | boolean | undefined): "full" | "lite" | undefined {
  if (value === undefined || value === false) return undefined;
  if (value === "full" || value === "lite") return value;
  throw new Error("--connector-mode must be full or lite");
}

function connectorIdsOption(value: string | boolean | undefined): ConnectorId[] | undefined {
  if (typeof value !== "string") return undefined;
  const ids = value.split(",").map((item) => item.trim()).filter(Boolean);
  const validIds = new Set<string>(CONNECTOR_PRESETS.map((preset) => preset.id));
  const invalid = ids.filter((id) => !validIds.has(id));
  if (invalid.length > 0) throw new Error(`Unknown connector id(s): ${invalid.join(", ")}`);
  return ids as ConnectorId[];
}

function stringListOption(value: string | boolean | undefined): string[] | undefined {
  if (typeof value !== "string") return undefined;
  if (value.trim().toLowerCase() === "none") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function languageOption(value: string | boolean | undefined): WellnessLanguage | undefined {
  if (value === undefined || value === false) return undefined;
  if (value === "en" || value === "pt-BR") return value;
  throw new Error("--language must be en or pt-BR");
}

function numberOption(value: string | boolean | undefined): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Expected a positive number");
  return parsed;
}

function formatStatusReport(report: DoctorReport): string {
  const profileCheck = report.checks.find((check) => check.id === "profile_home");
  const onboardingCheck = report.checks.find((check) => check.id === "onboarding");
  const installed = profileCheck?.ok ?? false;
  const lines: string[] = [];
  lines.push("Delx Wellness for Hermes status");
  lines.push("");
  lines.push(`Profile: ${report.profileName}`);
  lines.push(`Path: ${report.hermesHome}`);
  lines.push(`Installed: ${installed ? "yes" : "no"}`);
  lines.push(`Mode: ${report.connectorMode}`);
  lines.push(
    `Active connectors: ${report.configuredConnectors.length > 0 ? report.configuredConnectors.join(", ") : "none"}`
  );
  if (report.missingDefaultConnectors.length > 0) {
    lines.push(`Missing default connectors: ${report.missingDefaultConnectors.join(", ")}`);
  }
  lines.push(`Onboarding file: ${onboardingCheck?.ok ? "present" : "missing"}`);
  lines.push(`Result: ${report.ready ? "ready" : "needs attention"}`);

  if (!installed) {
    lines.push("");
    lines.push(`Not installed yet — run: npx -y delx-wellness-hermes setup --profile ${report.profileName}`);
  } else if (!report.ready) {
    lines.push("");
    lines.push(`For details and fixes, run: npx -y delx-wellness-hermes doctor --profile ${report.profileName}`);
  }

  return lines.join("\n");
}

function formatUninstallResult(result: UninstallResult): string {
  const lines: string[] = [];
  lines.push(`Delx Wellness for Hermes uninstall${result.dryRun ? " (dry run)" : ""}`);
  lines.push("");
  lines.push(`Profile: ${result.profileName}`);
  lines.push(`Path: ${result.hermesHome}`);

  if (!result.existed) {
    lines.push("");
    lines.push("Nothing to remove — this profile is not installed.");
    return lines.join("\n");
  }

  if (result.dryRun) {
    lines.push("");
    lines.push("Would remove the profile home shown above.");
    lines.push(`Re-run with --write to apply: npx -y delx-wellness-hermes uninstall --profile ${result.profileName} --write`);
    return lines.join("\n");
  }

  lines.push("");
  if (result.backupPath) lines.push(`Backed up config.yaml to: ${result.backupPath}`);
  lines.push("Removed:");
  for (const removed of result.removedPaths) {
    lines.push(`- ${removed}`);
  }
  return lines.join("\n");
}

function printUsage(): void {
  console.log(`Usage:
  delx-wellness-hermes setup [--connector-mode full|lite] [--connectors whoop,garmin,nourish]
  delx-wellness-hermes setup --dry-run
  delx-wellness-hermes status [--profile delx-wellness] [--json]
  delx-wellness-hermes connectors [--json]
  delx-wellness-hermes install --profile delx-wellness --dry-run
  delx-wellness-hermes install --profile delx-wellness --write [--connector-mode full|lite]
  delx-wellness-hermes uninstall --profile delx-wellness [--write]
  delx-wellness-hermes doctor --profile delx-wellness [--json]
  delx-wellness-hermes doctor --profile delx-wellness --run-hermes
  delx-wellness-hermes doctor --profile delx-wellness --run-hermes --test-chat
  delx-wellness-hermes onboarding --profile delx-wellness [--language en|pt-BR]
  delx-wellness-hermes e2e --profile delx-wellness --test-connectors nourish [--json]
`);
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(`Error: ${formatError(error)}`);
  process.exitCode = 1;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
