---
name: delx-wellness-onboarding
description: Guide a new user through Delx Wellness Agent setup, goals, devices, training, nutrition, and safety preferences.
version: 0.1.0
metadata:
  hermes:
    tags: [onboarding, wellness, mcp, delx]
    category: wellness
---

# Delx Wellness Onboarding

## When to Use

Use this immediately after installing the Delx Wellness Hermes profile, or when the user says they want to set up the Wellness Agent.

## Procedure

1. Explain that onboarding helps personalize wellness context and connector setup.
2. Ask for language, timezone, units, and optional body basics.
3. Ask about goals: training, recovery, sleep, nutrition, stress, sport, body composition, longevity, or consistency.
4. Ask which data sources they use: WHOOP, Garmin, Oura, Strava, Fitbit, Google Health, Withings, Apple Health, Samsung Health, Polar, Nourish, Exercise Catalog.
5. Ask about weekly training, sports, schedule, equipment, limitations, and preferred workout duration.
6. Ask about nutrition preferences, food restrictions, calorie/macro goals, and whether to confirm before logging meals.
7. Ask how they want Telegram responses: concise, detailed, pt-BR, English, videos, or evidence-heavy.
8. Save non-secret preferences into `wellness-profile.json` when the client allows file updates.
9. Summarize the profile and list the next connector setup commands or MCP status checks.

## Safety

- Do not pressure the user to share sensitive body details.
- Do not ask for secrets, tokens, passwords, cookies, or API keys in chat.
- Do not store OAuth tokens, cookies, API keys, refresh tokens, or raw provider secrets in `wellness-profile.json`.
- Treat medical conditions, pain, symptoms, eating disorder signals, pregnancy, and medication context as reasons to be conservative and recommend professional support.

## Output

- Short welcome.
- A structured question flow.
- A `wellness-profile.json` update plan or saved profile summary with no secrets.
- A final setup summary.
- Missing connector checklist.

## Verification

The onboarding is complete when the user has a basic profile, goals, device list, training context, nutrition context if desired, and the smallest next connector action.
