# Setup transcript (sanitized expected output)

Issue: [#1](https://github.com/davidmosiah/delx-wellness-hermes/issues/1)

This is the **expected shape** of a dry-run setup. Paths are generic (`~/.hermes/...`). No secrets, no real profile values.

## Command

```bash
npx -y delx-wellness-hermes@0.3.9 setup --dry-run
```

## Expected output (captured 2026-08-11, hermes pack 0.3.7)

```
Delx Wellness for Hermes dry run

Profile: delx-wellness
Path: ~/.hermes/profiles/delx-wellness

No files were written.

--- redacted config preview ---
skills:
  external_dirs:
    - ~/.hermes/profiles/delx-wellness/skills/delx-wellness
mcp_servers:
  whoop:
    command: npx
    args:
      - -y
      - whoop-mcp-unofficial@0.6.2
  garmin:
    command: npx
    args:
      - -y
      - garmin-mcp-unofficial@0.7.3
  oura:
    command: npx
    args:
      - -y
      - oura-mcp-unofficial@0.6.2
  strava:
    command: npx
    args:
      - -y
      - strava-mcp-unofficial@0.6.1
  fitbit:
    command: npx
    args:
      - -y
      - fitbit-mcp-unofficial@0.6.1
  google_health:
    command: npx
    args:
      - -y
      - google-health-mcp-unofficial@0.7.4
  withings:
    command: npx
    args:
      - -y
      - withings-mcp-unofficial@0.5.2
  apple_health:
    command: npx
    args:
      - -y
      - apple-health-mcp-unofficial@0.7.2
  samsung_health:
    command: npx
    args:
      - -y
      - samsung-health-mcp-unofficial@0.7.2
  polar:
    command: npx
    args:
      - -y
      - polar-mcp-unofficial@0.5.0
  nourish:
    command: npx
    args:
      - -y
      - wellness-nourish@0.8.1
delx_wellness:
  profile_name: delx-wellness
  mode: local
  connector_mode: full
  generated_by: delx-wellness-hermes
  onboarding:
    required: true
    template: ONBOARDING.md
    profile_path: wellness-profile.json
    next_step: Run `delx-wellness-hermes onboarding --profile delx-wellness` or ask Hermes to use the delx-wellness-onboarding skill.
  connectors:
    - id: whoop
      display_name: WHOOP
      enabled: true
      category: physiology
      privacy: oauth-local-token
      notes: Recovery, strain, sleep, HRV, resting heart rate, and workouts.
    - id: garmin
      display_name: Garmin
      enabled: true
      category: physiology
      privacy: oauth-local-token
      notes: Training load, activities, readiness-style context, sleep, and wellness signals.
    - id: oura
      display_name: Oura
      enabled: true
      category: physiology
      privacy: oauth-local-token
      notes: Readiness, sleep, activity, HRV, and recovery context.
    - id: strava
      display_name: Strava
      enabled: true
      category: activity
      privacy: oauth-local-token
      notes: Training history, workouts, load proxies, activities, and effort context.
    - id: fitbit
      display_name: Fitbit
      enabled: true
      category: physiology
      privacy: oauth-local-token
      notes: Activity, sleep, heart rate, steps, and calorie context.
    - id: google_health
      display_name: Google Health
      enabled: true
      category: physiology
      privacy: oauth-local-token
      notes: Google Health API v4 beta identity, profile, settings, data points, reconcile, rollups, and Fitbit migration context.
    - id: withings
      display_name: Withings
      enabled: true
      category: physiology
      privacy: oauth-local-token
      notes: Body composition, measurements, sleep, and health-device context.
    - id: apple_health
      display_name: Apple Health
      enabled: true
      category: physiology
      privacy: local-first
      notes: Local Apple Health exports and aggregated wellness records.
    - id: samsung_health
      display_name: Samsung Health
      enabled: true
      category: physiology
      privacy: local-first
      notes: Local Samsung Health CSV/ZIP exports, Galaxy Watch sleep/activity, HRV, heart, and workout records.
    - id: polar
      display_name: Polar
      enabled: true
      category: physiology
      privacy: oauth-local-token
      notes: Training, recovery-adjacent, heart rate, and activity context.
    - id: eight_sleep
      display_name: Eight Sleep
      enabled: false
      category: physiology
      privacy: oauth-local-token
      notes: Smart-mattress sleep trends, smart-temperature schedule, alarms, and adjustable base. Mutations gated by EIGHT_SLEEP_ALLOW_MUTATIONS.
    - id: nourish
      display_name: Nourish
      enabled: true
      category: nutrition
      privacy: local-first
      notes: Food search, meal parsing, local nutrition logging, barcode, and pt-BR input.
    - id: wellness_air
      display_name: Wellness Air
      enabled: false
      category: physiology
      privacy: local-first
      notes: Indoor air quality (PM2.5, CO2, VOC) via AirGradient API key or local IP. Pair with sleep/recovery to correlate environment with rest.
    - id: wellness_cycle_coach
      display_name: Wellness Cycle Coach
      enabled: false
      category: physiology
      privacy: local-first
      notes: Stateless menstrual-cycle coach (phase detection, nutrition + training guidance). Not medical advice. Off by default — opt-in based on user need.
    - id: wellness_cgm
      display_name: Wellness CGM
      enabled: false
      category: physiology
      privacy: oauth-local-token
      notes: Dexcom CGM with TIR/GMI/meal-response. NOT medical advice; do not use for emergency hypo/hyper detection. Sandbox mode works without real Dexcom credentials.
    - id: exercise_catalog
      display_name: Exercise Catalog
      enabled: false
      category: exercise
      privacy: private-catalog
      notes: Private exercise catalog for workout building with instructions and media.

Next steps:
- Review the config preview, then run: npx -y delx-wellness-hermes setup --profile delx-wellness
- Nothing was written in dry-run mode.
```

## Connector counts (full mode)

| | Count |
|---|---:|
| MCP servers pinned in preview (default on) | typically 11 (`npx -y package@version`) |
| Preset catalog total | 16 (see `connectors` command) |
| Default **enabled** | 11 |
| Opt-in **disabled** | 5 (`eight_sleep`, `wellness_air`, `wellness_cycle_coach`, `wellness_cgm`, `exercise_catalog`) |

## After a real `setup` (not dry-run)

Expected side effects (high level):

1. Profile directory `~/.hermes/profiles/delx-wellness/`
2. Skills under that profile (`onboarding`, `daily brief`, `daily operator`, `training`, `sleep`, `nutrition`, `setup`)
3. MCP config with **pinned** `npx -y <pkg>@<ver>` args
4. Optional Nourish smoke (no OAuth) unless `--skip-smoke`
5. Printed next steps for model setup / per-provider auth

## Lite mode

```bash
npx -y delx-wellness-hermes@0.3.9 setup --dry-run --connector-mode lite
```

Wires a smaller default set (see README — Garmin + Nourish oriented lite path).

## Verification

```bash
npx -y delx-wellness-hermes@0.3.9 connectors
npx -y delx-wellness-hermes@0.3.9 doctor --profile delx-wellness
```

Do not paste real token paths, emails, or OAuth codes into issues.
