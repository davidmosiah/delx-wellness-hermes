import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { doctorDelxWellnessHermesProfile, type DoctorReport } from "./doctor.js";
import { DEFAULT_PROFILE_NAME, resolveHermesHome } from "./paths.js";

const execFileAsync = promisify(execFile);
const DEFAULT_E2E_TIMEOUT_MS = 180_000;

export type RunDelxWellnessE2EOptions = {
  profileName?: string;
  hermesHome?: string;
  packageRoot?: string;
  hermesBinary?: string;
  testConnectors?: string[];
  prompt?: string;
  promptFile?: string;
  timeoutMs?: number;
};

export type DelxWellnessE2EReport = {
  profileName: string;
  hermesHome: string;
  ready: boolean;
  doctor: DoctorReport;
  prompt: string;
  response: string;
  error?: string;
};

export async function runDelxWellnessE2E(options: RunDelxWellnessE2EOptions = {}): Promise<DelxWellnessE2EReport> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  const hermesHome = options.hermesHome ?? resolveHermesHome(profileName);
  const hermesBinary = options.hermesBinary ?? "hermes";
  const doctorOptions: Parameters<typeof doctorDelxWellnessHermesProfile>[0] = {
    profileName,
    hermesHome,
    runHermes: true,
    hermesBinary,
    testConnectors: options.testConnectors ?? ["nourish"]
  };
  if (options.packageRoot !== undefined) doctorOptions.packageRoot = options.packageRoot;
  const doctor = await doctorDelxWellnessHermesProfile(doctorOptions);
  const prompt = await resolvePrompt(options);

  try {
    const { stdout, stderr } = await execFileAsync(hermesBinary, ["-p", profileName, "-z", prompt], {
      timeout: options.timeoutMs ?? DEFAULT_E2E_TIMEOUT_MS,
      maxBuffer: 512_000
    });
    const response = redactOutput(`${stdout}${stderr}`.trim());
    return {
      profileName,
      hermesHome,
      ready: doctor.ready && response.length > 0,
      doctor,
      prompt,
      response
    };
  } catch (error) {
    const response = commandOutput(error);
    const usableResponse = isUsableE2EResponse(response);
    return {
      profileName,
      hermesHome,
      ready: doctor.ready && usableResponse,
      doctor,
      prompt,
      response,
      error: formatCommandError(error)
    };
  }
}

export function buildDelxWellnessE2EPrompt(): string {
  return `You are running a read-only Delx Wellness Hermes end-to-end QA check.

Use the Delx Wellness onboarding context and available MCP tools as a real user would, but do not perform destructive or credential-changing actions.

Safety rules:
- Do not revoke, delete, disconnect, refresh, clear, mutate, or overwrite credentials, tokens, provider links, user records, or logs.
- Do not print tokens, cookies, API keys, refresh tokens, Authorization headers, or raw secrets.
- Prefer read-only summaries, status checks, recent wellness context, nutrition lookup, and training guidance.

QA task:
1. Start with a concise onboarding-style greeting and identify any missing profile fields.
2. Check connector availability/status before using data.
3. If nutrition tools are available, simulate a safe breakfast or meal-planning lookup without permanently logging anything.
4. If recovery/activity tools are available, summarize how an agent should decide whether the user should train hard today.
5. Finish with a short "QA notes" section listing what worked, what was missing, and the next safest setup step.`;
}

async function resolvePrompt(options: RunDelxWellnessE2EOptions): Promise<string> {
  if (options.prompt !== undefined) return options.prompt;
  if (options.promptFile !== undefined) return fs.readFile(options.promptFile, "utf8");
  return buildDelxWellnessE2EPrompt();
}

function redactOutput(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(token|secret|password|api[_-]?key|authorization)=\S+/gi, "$1=[redacted]");
}

function commandOutput(error: unknown): string {
  const stdout = getStringProperty(error, "stdout");
  const stderr = getStringProperty(error, "stderr");
  return redactOutput(`${stdout}${stderr}`.trim());
}

function isUsableE2EResponse(response: string): boolean {
  if (!response.trim()) return false;
  if (/No inference provider configured/i.test(response)) return false;
  return /QA notes|Next safest setup step|Connector status|onboarding/i.test(response);
}

function formatCommandError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const output = commandOutput(error) || redactOutput(message);
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 ? lines.slice(-4).join(" | ") : redactOutput(message);
}

function getStringProperty(value: unknown, key: string): string {
  if (typeof value !== "object" || value === null || !(key in value)) return "";
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : "";
}
