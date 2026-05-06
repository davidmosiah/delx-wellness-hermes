---
name: delx-wellness-training
description: Recommend today's training intensity from recovery, sleep, activity, and exercise catalog data.
version: 0.1.0
metadata:
  hermes:
    tags: [training, recovery, exercise, mcp, delx]
    category: wellness
---

# Delx Wellness Training

## When to Use

Use this when the user asks if they should train hard, rest, play tennis, lift, run, deload, or build a workout.

## Procedure

1. Pull recovery context with `wellness_today`, `recommend_today_training`, or provider tools.
2. Consider recent strain, sleep quality, HRV/readiness, activity load, soreness, and user objective.
3. If a workout is requested, call `build_workout_from_recovery` or Exercise Catalog tools when available.
4. Choose one of: hard session, moderate session, technique session, mobility/recovery, rest.
5. Explain why in practical language.

## Output

- Recommendation.
- Intensity target.
- Workout outline or recovery protocol.
- Evidence from tools.
- Confidence and data gaps.

## Safety

- Do not tell the user to train through injury, chest pain, fainting, fever, or concerning symptoms.
- Ask a clarifying question if symptoms or injury risk are present.
- Keep advice non-medical.

## Verification

The recommendation should be traceable to live or recent wellness data, or clearly marked as low-confidence.
