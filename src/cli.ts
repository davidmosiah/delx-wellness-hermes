import { doctorDelxWellnessHermesProfile } from "./doctor.js";
import { installDelxWellnessHermesProfile } from "./install.js";
import { createOnboardingFile, formatOnboardingQuestions } from "./onboarding.js";

type ParsedArgs = {
  command: string;
  options: Record<string, string | boolean>;
};

async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);

  if (parsed.command === "install") {
    const result = await installDelxWellnessHermesProfile({
      profileName: stringOption(parsed.options.profile, "delx-wellness"),
      mode: parsed.options.mode === "hosted" ? "hosted" : "local",
      hubUrl: stringOption(parsed.options["hub-url"], undefined),
      write: parsed.options.write === true
    });
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

  if (parsed.command === "doctor") {
    const report = await doctorDelxWellnessHermesProfile({
      profileName: stringOption(parsed.options.profile, "delx-wellness"),
      runHermes: parsed.options["run-hermes"] === true,
      testChat: parsed.options["test-chat"] === true,
      hermesBinary: stringOption(parsed.options.hermes, undefined),
      testConnectors: stringOption(parsed.options["test-connectors"], undefined)?.split(",").map((item) => item.trim()).filter(Boolean)
    });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.ready ? 0 : 1;
    return;
  }

  if (parsed.command === "onboarding") {
    const result = await createOnboardingFile({
      profileName: stringOption(parsed.options.profile, "delx-wellness"),
      write: parsed.options.write === true
    });
    console.log(JSON.stringify({
      profileName: result.profileName,
      hermesHome: result.hermesHome,
      onboardingPath: result.onboardingPath,
      written: result.written
    }, null, 2));
    console.log("--- onboarding questions ---");
    console.log(formatOnboardingQuestions(result.questions));
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

function printUsage(): void {
  console.error(`Usage:
  delx-wellness-hermes install --profile delx-wellness --dry-run
  delx-wellness-hermes install --profile delx-wellness --write
  delx-wellness-hermes doctor --profile delx-wellness
  delx-wellness-hermes doctor --profile delx-wellness --run-hermes
  delx-wellness-hermes doctor --profile delx-wellness --run-hermes --test-chat
  delx-wellness-hermes onboarding --profile delx-wellness
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
