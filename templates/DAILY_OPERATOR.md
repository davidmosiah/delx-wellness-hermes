# Delx Wellness Daily Operator

Use this prompt when you want Hermes to run the daily wellness operator loop.
It is designed for terminal and Telegram-style responses.

## Daily Operator Prompt

```text
Run the Delx Wellness Daily Operator loop.

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
- Keep the answer concise and useful for terminal or Telegram.
```

## Hermes Command

```bash
hermes -p delx-wellness -z "$(npx -y delx-wellness-hermes operator --prompt-only)"
```

## Fast No-OAuth Demo

If no wearable provider is connected yet, start with Nourish:

```text
Run the Delx Wellness Daily Operator loop, but use Nourish first. Estimate a practical breakfast idea for today and do not log anything unless I explicitly confirm.
```

## Setup Recovery Prompt

If the operator reports missing data:

```text
Use delx-wellness-setup. Check the Delx Wellness Hermes profile, list available MCP servers, and give me the smallest next setup command. Do not ask me to paste secrets into chat.
```
