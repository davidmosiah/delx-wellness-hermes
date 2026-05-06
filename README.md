# Delx Wellness for Hermes

Turn Hermes into your personal wellness agent in a few minutes.

Delx Wellness for Hermes installs a local-first Hermes profile with wearable MCP connector presets, onboarding, wellness skills, a recovery-aware `SOUL.md`, and setup checks. It does not fork Hermes and it does not send your tokens to a hosted vault. It uses the Hermes profile system, so you can keep tracking upstream Hermes while giving one profile a clear wellness operating model.

## Why Use It

- One wellness profile instead of wiring every connector by hand.
- Built for real daily use through Hermes, Telegram, and MCP tools.
- Starts with local nutrition immediately through Nourish, no OAuth required.
- Adds WHOOP, Garmin, Oura, Strava, Fitbit, Withings, Apple Health and Polar presets.
- Gives the agent onboarding context before it recommends training, sleep, recovery or nutrition decisions.
- Keeps provider credentials inside local connector setup flows.

## Quick Start

If Hermes is already installed:

```bash
npx -y delx-wellness-hermes setup
hermes -p delx-wellness
```

If this profile does not have a model configured yet:

```bash
hermes -p delx-wellness model
npx -y delx-wellness-hermes doctor --profile delx-wellness --run-hermes --test-chat
```

If you are new to Hermes, install Hermes first:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash -s -- --skip-setup
npx -y delx-wellness-hermes setup
hermes -p delx-wellness
```

## What `setup` Does

`setup` is the guided path. It:

- creates or updates `~/.hermes/profiles/delx-wellness`
- installs `SOUL.md`, `AGENTS.md` and `ONBOARDING.md`
- installs Delx Wellness skills for onboarding, daily brief, training, sleep, nutrition and setup
- writes local MCP presets for WHOOP, Garmin, Oura, Strava, Fitbit, Withings, Apple Health, Polar and Nourish
- runs Hermes profile checks when `hermes` is available
- smoke-tests `nourish` through Hermes because it does not require OAuth
- prints the next commands for model setup, chat verification and connector auth

Preview before writing:

```bash
npx -y delx-wellness-hermes setup --dry-run
```

Skip the Nourish smoke test:

```bash
npx -y delx-wellness-hermes setup --skip-smoke
```

## Manual Flow

Use the manual commands when you want to inspect each step:

```bash
npx -y delx-wellness-hermes install --profile delx-wellness --dry-run
npx -y delx-wellness-hermes install --profile delx-wellness --write
npx -y delx-wellness-hermes onboarding --profile delx-wellness --write
npx -y delx-wellness-hermes doctor --profile delx-wellness --run-hermes
```

## Validate MCP and Chat

MCP-only checks verify profile files, skills and connector presets:

```bash
npx -y delx-wellness-hermes doctor --profile delx-wellness --run-hermes
hermes -p delx-wellness mcp list
hermes -p delx-wellness mcp test nourish
```

Full chat readiness requires a model/provider configured for the profile:

```bash
hermes -p delx-wellness model
npx -y delx-wellness-hermes doctor --profile delx-wellness --run-hermes --test-chat
```

`--test-chat` makes a short Hermes model call, so it may use provider quota. MCP-only checks do not require model access.

## Onboarding

The onboarding worksheet gives the agent the context a real wellness product should ask for:

- language, timezone and units
- optional age, height, weight and gender context
- primary goal and secondary goals
- connected devices and apps
- training schedule, sports and upcoming events
- nutrition habits, restrictions and macro goals
- equipment, workout duration and exercises to avoid
- response style for Telegram or terminal use
- injuries, pain, medical constraints and conservative decision rules

The user never needs to paste tokens or secrets into chat.

## Connector Presets

Default local MCP presets:

- WHOOP: `whoop-mcp-unofficial`
- Garmin: `garmin-mcp-unofficial`
- Oura: `oura-mcp-unofficial`
- Strava: `strava-mcp-unofficial`
- Fitbit: `fitbit-mcp-unofficial`
- Withings: `withings-mcp-unofficial`
- Apple Health: `apple-health-mcp-unofficial`
- Polar: `polar-mcp-unofficial`
- Nourish: `wellness-nourish`

Exercise Catalog is kept disabled by default because private catalog access may depend on non-public data.

## Hosted Hub Mode

Hosted hub mode is explicit and has no default production URL:

```bash
npx -y delx-wellness-hermes setup \
  --mode hosted \
  --hub-url https://your-private-hub.example/mcp \
  --dry-run
```

## Public-Safe Boundary

This package is safe to publish because it contains:

- profile templates
- public skills
- connector package presets
- config generation
- setup and doctor checks

It must not contain:

- real user tokens
- OAuth credentials
- personal `~/.hermes` config
- Telegram gateway secrets
- private hosted hub API keys
- private Exercise Catalog data

## Development

```bash
npm install
npm test
npm pack --dry-run
```

## License

MIT
