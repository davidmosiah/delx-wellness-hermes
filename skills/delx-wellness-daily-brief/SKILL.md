---
name: delx-wellness-daily-brief
description: Build a daily wellness brief from Delx Wellness MCP providers.
version: 0.1.0
metadata:
  hermes:
    tags: [wellness, recovery, mcp, delx]
    category: wellness
---

# Delx Wellness Daily Brief

## When to Use

Use this when the user asks about today, readiness, energy, recovery, sleep, or what they should focus on today.

## Procedure

1. Check provider availability with `wellness_provider_status` when setup may be incomplete.
2. Pull current context with `wellness_today` or `wellness_summary`.
3. Summarize recovery, sleep, activity, and nutrition if available.
4. Give one clear recommendation for the day.
5. Mention provider source and freshness when confidence depends on it.

## Output

- One-line recommendation.
- Evidence bullets.
- One practical next action.
- Non-medical caveat only when risk or uncertainty is meaningful.

## Pitfalls

- Do not claim certainty when data is stale or providers disagree.
- Do not invent missing nutrition or workout data.
- Do not give medical advice.

## Verification

The answer should cite at least one real data source or explain what setup is missing.
