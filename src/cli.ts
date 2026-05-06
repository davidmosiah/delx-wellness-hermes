import { CONNECTOR_PRESETS, type ConnectorId } from "./connector-presets.js";
import { doctorDelxWellnessHermesProfile } from "./doctor.js";
import { runDelxWellnessE2E } from "./e2e.js";
import { installDelxWellnessHermesProfile } from "./install.js";
import { createOnboardingFile, formatOnboardingQuestions } from "./onboarding.js";
import { formatSetupResult, setupDelxWellnessHermes } from "./setup.js";
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
      dryRun: parsed.options["dry-run"] === false,
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
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ready ? 0 : 1;
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
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ready ? 0 : 1;
    return;
  }

  printUsage();
  process.exitCode = 1;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg?.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "write" || key === "dry-run") {
      options[key] = key === "write";
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

function printUsage(): void {
  console.log(`Usage:
  delx-wellness-hermes setup [--connector-mode full|lite] [--connectors whoop,garmin,nourish]
  delx-wellness-hermes setup --dry-run
  delx-wellness-hermes install --profile delx-wellness --dry-run
  delx-wellness-hermes install --profile delx-wellness --write [--connector-mode full|lite]
  delx-wellness-hermes doctor --profile delx-wellness
  delx-wellness-hermes doctor --profile delx-wellness --run-hermes
  delx-wellness-hermes doctor --profile delx-wellness --run-hermes --test-chat
  delx-wellness-hermes onboarding --profile delx-wellness [--language en|pt-BR]
  delx-wellness-hermes e2e --profile delx-wellness --test-connectors nourish
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
