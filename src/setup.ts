import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ConnectorId } from "./connector-presets.js";
import { doctorDelxWellnessHermesProfile, type DoctorReport } from "./doctor.js";
import { installDelxWellnessHermesProfile, type InstallResult } from "./install.js";
import { ONBOARDING_QUESTIONS } from "./onboarding.js";
import { DEFAULT_PROFILE_NAME } from "./paths.js";

const execFileAsync = promisify(execFile);

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

  return {
    profileName,
    dryRun,
    hermesDetected,
    install,
    doctor,
    nextSteps: nextStepsFor({
      profileName,
      hermesDetected,
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

function nextStepsFor(options: {
  profileName: string;
  hermesDetected: boolean;
  testChat: boolean;
}): string[] {
  if (!options.hermesDetected) {
    return [
      "Install Hermes from https://github.com/NousResearch/hermes-agent.",
      `Then run: npx -y delx-wellness-hermes doctor --profile ${options.profileName} --run-hermes`,
      `Start Hermes with: hermes -p ${options.profileName}`
    ];
  }

  const steps = [
    `Configure a model/provider if this profile does not have one yet: hermes -p ${options.profileName} model`,
    `Start the wellness agent: hermes -p ${options.profileName}`,
    "Connect provider credentials only through each connector's setup flow; never paste OAuth tokens into chat."
  ];

  if (!options.testChat) {
    steps.splice(
      1,
      0,
      `Optional full chat check: npx -y delx-wellness-hermes doctor --profile ${options.profileName} --run-hermes --test-chat`
    );
  }

  return steps;
}
