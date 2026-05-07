---
name: delx-wellness-setup
description: Diagnose Delx Wellness connector setup and missing Hermes MCP configuration.
version: 0.1.0
metadata:
  hermes:
    tags: [setup, mcp, connectors, delx]
    category: wellness
---

# Delx Wellness Setup

## When to Use

Use this when the user asks why a provider is missing, why a tool is unavailable, or how to connect WHOOP, Garmin, Oura, Strava, Fitbit, Withings, Apple Health, Samsung Health, Polar, Nourish, or Exercise Catalog.

## Procedure

1. Check `wellness_provider_status` and `wellness_capabilities` if available.
2. If running in Hermes, suggest `hermes -p delx-wellness mcp list`.
3. For this profile pack, suggest `delx-wellness-hermes doctor --profile delx-wellness`.
4. Give the smallest next setup action.
5. Never ask the user to paste secrets into chat.

## Output

- Current setup status.
- Missing connector or token.
- Exact next command or UI step.
- Privacy note when credentials are involved.

## Pitfalls

- Do not print tokens or config secrets.
- Do not assume hosted hub mode is active.
- Do not imply private Exercise Catalog access is public.

## Verification

The answer should identify whether the issue is missing MCP config, missing credentials, stale tokens, or missing provider data.
