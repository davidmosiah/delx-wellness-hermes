import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { parseHermesConfig } from "./config-generator.js";
import type { ConnectorId } from "./connector-presets.js";
import { doctorDelxWellnessHermesProfile, type DoctorReport } from "./doctor.js";
import { installDelxWellnessHermesProfile, type InstallResult } from "./install.js";
import { ONBOARDING_QUESTIONS } from "./onboarding.js";
import { DEFAULT_PROFILE_NAME } from "./paths.js";

const execFileAsync = promisify(execFile);
const MODEL_STATUS_TIMEOUT_MS = 15_000;

export type SetupOptions = {
  profileName?: string;
  mode?: "local" | "hosted";
  connectorMode?: "full" | "lite";
  connectorIds?: ConnectorId[];
  hubUrl?: string | undefined;
  hermesHome?: string | undefined;
  packageRoot?: string | undefined;
  dryRun?: boolean | undefined;
  hermesBinary?: string | undefined;
  skipSmoke?: boolean | undefined;
  testChat?: boolean | undefined;
};

export type SetupResult = {
  profileName: string;
  dryRun: boolean;
  hermesDetected: boolean;
  modelConfigured: boolean;
  install: InstallResult;
  doctor?: DoctorReport;
  nextSteps: string[];
};

export async function setupDelxWellnessHermes(options: SetupOptions = {}): Promise<SetupResult> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  const hermesBinary = options.hermesBinary ?? "hermes";
  const dryRun = Boolean(options.dryRun);
  const installOptions: Parameters<typeof installDelxWellnessHermesProfile>[0] = {
    profileName,
    write: !dryRun
  };
  if (options.mode !== undefined) installOptions.mode = options.mode;
  if (options.connectorMode !== undefined) installOptions.connectorMode = options.connectorMode;
  if (options.connectorIds !== undefined) installOptions.connectorIds = options.connectorIds;
  if (options.hubUrl !== undefined) installOptions.hubUrl = options.hubUrl;
  if (options.hermesHome !== undefined) installOptions.hermesHome = options.hermesHome;
  if (options.packageRoot !== undefined) installOptions.packageRoot = options.packageRoot;
  const install = await installDelxWellnessHermesProfile(installOptions);

  if (dryRun) {
    return {
      profileName,
      dryRun,
      hermesDetected: false,
      modelConfigured: false,
      install,
      nextSteps: [
        `Review the config preview, then run: npx -y delx-wellness-hermes setup --profile ${profileName}`,
        "Nothing was written in dry-run mode."
      ]
    };
  }

  const hermesDetected = await isHermesAvailable(hermesBinary);
  const doctorOptions: Parameters<typeof doctorDelxWellnessHermesProfile>[0] = {
    profileName,
    runHermes: hermesDetected,
    hermesBinary,
    testConnectors: hermesDetected && !options.skipSmoke ? ["nourish"] : []
  };
  if (options.hermesHome !== undefined) doctorOptions.hermesHome = options.hermesHome;
  if (options.packageRoot !== undefined) doctorOptions.packageRoot = options.packageRoot;
  if (options.testChat !== undefined) doctorOptions.testChat = options.testChat;
  const doctor = await doctorDelxWellnessHermesProfile(doctorOptions);

  const modelConfigured = await isModelConfigured({
    configPath: path.join(install.hermesHome, "config.yaml"),
    hermesBinary,
    hermesDetected,
    profileName
  });

  return {
    profileName,
    dryRun,
    hermesDetected,
    modelConfigured,
    install,
    doctor,
    nextSteps: nextStepsFor({
      profileName,
      hermesDetected,
      modelConfigured,
      testChat: Boolean(options.testChat)
    })
  };
}

export function formatSetupResult(result: SetupResult): string {
  const lines: string[] = [];
  lines.push(`Delx Wellness for Hermes ${result.dryRun ? "dry run" : "setup"}`);
  lines.push("");
  lines.push(`Profile: ${result.profileName}`);
  lines.push(`Path: ${result.install.hermesHome}`);

  if (!result.dryRun && !result.hermesDetected) {
    lines.push("");
    lines.push(
      "WARNING: Hermes not detected — MCP/chat checks skipped. " +
        `Install Hermes and run 'npx -y delx-wellness-hermes doctor --profile ${result.profileName} --run-hermes' to validate.`
    );
  }

  lines.push("");

  if (result.dryRun) {
    lines.push("No files were written.");
    lines.push("");
    lines.push("--- redacted config preview ---");
    lines.push(result.install.renderedConfig.trimEnd());
  } else {
    lines.push("Installed:");
    for (const filePath of result.install.changedFiles) {
      lines.push(`- ${filePath}`);
    }

    if (result.doctor) {
      lines.push("");
      lines.push("Checks:");
      for (const check of result.doctor.checks) {
        lines.push(`- ${check.ok ? "ok" : "needs attention"} ${check.id}: ${check.message}`);
      }
      if (result.hermesDetected && !result.modelConfigured) {
        lines.push(
          `- needs attention model: no model configured; run 'hermes -p ${result.profileName} model' before chatting`
        );
      }
    }

    lines.push("");
    lines.push("Onboarding:");
    lines.push(`- ${ONBOARDING_QUESTIONS.filter((question) => question.required).length} required questions`);
    lines.push(`- ${ONBOARDING_QUESTIONS.length} total context prompts`);
  }

  lines.push("");
  lines.push("Next steps:");
  for (const step of result.nextSteps) {
    lines.push(`- ${step}`);
  }

  return lines.join("\n");
}

async function isHermesAvailable(hermesBinary: string): Promise<boolean> {
  try {
    await execFileAsync(hermesBinary, ["--version"], { timeout: 15_000, maxBuffer: 16_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Light model/provider detection that runs by default (unlike the opt-in
 * --test-chat smoke). It avoids a full inference round-trip: first it reads the
 * profile config.yaml for a model/provider key, then — only if Hermes is
 * available and the config was inconclusive — it tries a cheap `model --status`
 * probe. Any probe failure is treated as "could not confirm" rather than an
 * error, so this never throws and never flips doctor.ready.
 */
async function isModelConfigured(input: {
  configPath: string;
  hermesBinary: string;
  hermesDetected: boolean;
  profileName: string;
}): Promise<boolean> {
  if (await configHasModel(input.configPath)) return true;
  if (!input.hermesDetected) return false;
  return probeModelStatus(input.hermesBinary, input.profileName);
}

async function configHasModel(configPath: string): Promise<boolean> {
  try {
    const config = parseHermesConfig(await fs.readFile(configPath, "utf8"));
    return hasModelKey(config);
  } catch {
    return false;
  }
}

function hasModelKey(config: Record<string, unknown>): boolean {
  if (isNonEmptyString(config.model)) return true;
  if (isNonEmptyString(config.provider)) return true;
  const inference = config.inference;
  if (typeof inference === "object" && inference !== null && !Array.isArray(inference)) {
    const record = inference as Record<string, unknown>;
    if (isNonEmptyString(record.model) || isNonEmptyString(record.provider)) return true;
  }
  return false;
}

async function probeModelStatus(hermesBinary: string, profileName: string): Promise<boolean> {
  try {
    const { stdout, stderr } = await execFileAsync(
      hermesBinary,
      ["-p", profileName, "model", "--status"],
      { timeout: MODEL_STATUS_TIMEOUT_MS, maxBuffer: 32_000 }
    );
    const output = `${stdout}${stderr}`;
    if (/no model|not configured|no inference provider|none configured/i.test(output)) return false;
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function nextStepsFor(options: {
  profileName: string;
  hermesDetected: boolean;
  modelConfigured: boolean;
  testChat: boolean;
}): string[] {
  if (!options.hermesDetected) {
    return [
      "Install Hermes from https://github.com/NousResearch/hermes-agent.",
      `Then run: npx -y delx-wellness-hermes doctor --profile ${options.profileName} --run-hermes`,
      `Preview the daily operator prompt: npx -y delx-wellness-hermes operator --profile ${options.profileName}`,
      `Start Hermes with: hermes -p ${options.profileName}`
    ];
  }

  const steps: string[] = [];

  // If no model/provider is configured, this is the very first thing the user
  // must do — otherwise their first message fails with "AuthError: no model".
  // Promote it to the top with a marker instead of leaving it as a soft bullet.
  if (!options.modelConfigured) {
    steps.push(
      `>> No model configured — run this before chatting: hermes -p ${options.profileName} model`
    );
  } else {
    steps.push(
      `Configure a model/provider if this profile does not have one yet: hermes -p ${options.profileName} model`
    );
  }

  steps.push(
    `Run the daily operator: hermes -p ${options.profileName} -z "$(npx -y delx-wellness-hermes operator --prompt-only)"`,
    `Start the wellness agent: hermes -p ${options.profileName}`,
    "Connect provider credentials only through each connector's setup flow; never paste OAuth tokens into chat."
  );

  if (!options.testChat) {
    steps.splice(
      1,
      0,
      `Optional full chat check: npx -y delx-wellness-hermes doctor --profile ${options.profileName} --run-hermes --test-chat`
    );
  }

  return steps;
}
