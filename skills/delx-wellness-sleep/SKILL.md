---
name: delx-wellness-sleep
description: Explain sleep and recovery signals from Delx Wellness MCP providers.
version: 0.1.0
metadata:
  hermes:
    tags: [sleep, recovery, hrv, mcp, delx]
    category: wellness
---

# Delx Wellness Sleep

## When to Use

Use this when the user asks why sleep was good or bad, what changed, or how sleep is affecting training and recovery.

## Procedure

1. Pull current and recent sleep context through `wellness_today`, `wellness_summary`, or provider-specific tools.
2. Compare sleep duration, quality score, HRV, resting heart rate, respiratory rate, strain, and activity context when available.
3. State the most likely wellness explanation.
4. Suggest one practical adjustment for the next sleep window.

## Output

- Main sleep read.
- Supporting signals.
- Training impact.
- One adjustment for tonight.

## Pitfalls

- Do not over-interpret a single night.
- Do not diagnose sleep disorders.
- Mention stale or missing data.

## Verification

The answer should identify which provider supplied sleep context and whether the data is fresh.
