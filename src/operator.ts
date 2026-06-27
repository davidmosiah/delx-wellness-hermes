import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PROFILE_NAME, resolveHermesHome, resolvePackageTemplatePath } from "./paths.js";

export const DAILY_OPERATOR_PROMPT = `Run the Delx Wellness Daily Operator loop.

Use my local Delx Wellness Hermes profile and available MCP tools. Start by checking setup and data availability. Prefer delx-living-body tools when available because they compose multiple connectors. If Living Body is unavailable, fall back to provider status, daily summaries, and Nourish.

Return:
1. One-line daily read.
2. Evidence bullets with provider/source and freshness.
3. One training or recovery action for today.
4. One nutrition or hydration action for today.
5. Missing setup checklist, only for unavailable or stale sources.
6. One next command or question that moves me forward.

Rules:
- Do not ask me to paste OAuth tokens, refresh tokens, cookies, passwords, API keys, or raw secret files into chat.
- Do not log food, water, goals, or saved meals unless I explicitly ask you to save.
- Do not give medical diagnosis or prescription.
- Be conservative for pain, chest symptoms, fainting, severe illness, injury, disordered eating signals, medication conflicts, pregnancy context, or abnormal readings.
- Keep the answer concise and useful for terminal or Telegram.`;

export type DailyOperatorOptions = {
  profileName?: string;
  hermesHome?: string;
  packageRoot?: string;
  write?: boolean;
};

export type DailyOperatorResult = {
  profileName: string;
  hermesHome: string;
  operatorPath: string;
  written: boolean;
  prompt: string;
  hermesCommand: string;
};

export async function createDailyOperatorFile(options: DailyOperatorOptions = {}): Promise<DailyOperatorResult> {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  const hermesHome = options.hermesHome ?? resolveHermesHome(profileName);
  const operatorPath = path.join(hermesHome, "DAILY_OPERATOR.md");
  const prompt = formatDailyOperatorPrompt();

  if (options.write) {
    await fs.mkdir(path.dirname(operatorPath), { recursive: true });
    await fs.copyFile(resolvePackageTemplatePath("DAILY_OPERATOR.md", options.packageRoot), operatorPath);
  }

  return {
    profileName,
    hermesHome,
    operatorPath,
    written: Boolean(options.write),
    prompt,
    hermesCommand: formatDailyOperatorHermesCommand(profileName)
  };
}

export function formatDailyOperatorPrompt(): string {
  return DAILY_OPERATOR_PROMPT;
}

export function formatDailyOperatorHermesCommand(profileName = DEFAULT_PROFILE_NAME): string {
  return `hermes -p ${shellWord(profileName)} -z "$(npx -y delx-wellness-hermes operator --prompt-only)"`;
}

function shellWord(value: string): string {
  if (/^[A-Za-z0-9._-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}
