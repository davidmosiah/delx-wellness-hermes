---
name: delx-wellness-nutrition
description: Combine nutrition logs with recovery and training context for wellness decisions.
version: 0.1.0
metadata:
  hermes:
    tags: [nutrition, food, recovery, mcp, delx]
    category: wellness
---

# Delx Wellness Nutrition

## When to Use

Use this when the user asks what to eat, how a meal affects training, or wants to log food in English or pt-BR.

## Procedure

1. Use Nourish tools for food search, barcode, meal parsing, or local logging.
2. Use wellness context to adapt advice to today's recovery and training load.
3. Keep recommendations practical and non-medical.
4. Ask for portion, goal, timing, or dietary restriction if missing.

## Output

- Short recommendation.
- Meal or macro context if available.
- Training/recovery adjustment.
- Missing info if needed.

## Safety

- Do not encourage extreme restriction, dehydration, or eating disorder behavior.
- Do not prescribe medical diets.
- Refer to a professional for medical nutrition needs.

## Verification

The answer should show whether nutrition data came from a log/search result or from user-provided text.
