# Delx Wellness for Hermes

Delx Wellness for Hermes turns [Hermes](https://github.com/NousResearch/hermes-agent) into a recovery-first wellness agent with MCP connector presets, onboarding, external skills, a `SOUL.md` personality, and a doctor command.

It does not fork Hermes. It uses Hermes profiles, external skills, and `mcp_servers` so the agent can keep tracking upstream Hermes as Hermes evolves.

## What It Does

- Creates a `delx-wellness` Hermes profile.
- Installs a wellness-focused `SOUL.md`.
- Adds agent rules in `AGENTS.md`.
- Adds an onboarding worksheet in `ONBOARDING.md`.
- Registers Delx Wellness skills for onboarding, daily brief, training, sleep, nutrition, and setup.
- Generates MCP config for WHOOP, Garmin, Oura, Strava, Fitbit, Withings, Apple Health, Polar, and Nourish.
- Keeps Exercise Catalog disabled by default because private catalog access may depend on non-public data.
- Provides a doctor command for setup checks and optional Hermes MCP checks.

## Quick Start

Install Hermes first, then run:

```bash
npx delx-wellness-hermes install --profile delx-wellness --dry-run
```

Review the generated config. If it looks correct:

```bash
npx delx-wellness-hermes install --profile delx-wellness --write
```

Start onboarding:

```bash
npx delx-wellness-hermes onboarding --profile delx-wellness --write
```

Check setup:

```bash
npx delx-wellness-hermes doctor --profile delx-wellness
```

If Hermes is available locally:

```bash
npx delx-wellness-hermes doctor --profile delx-wellness --run-hermes
```

## Onboarding

The onboarding flow guides the agent through the context a real wellness product needs:

- language, timezone, and units
- optional body basics
- goals and priorities
- connected devices and apps
- training schedule and sports
- nutrition preferences
- equipment and exercise limitations
- Telegram response preferences
- safety boundaries

The user never needs to paste tokens or secrets into chat.

## Connectors

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

Hosted hub mode is explicit and has no default production URL:

```bash
npx delx-wellness-hermes install \
  --profile delx-wellness \
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
- local setup checks

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
