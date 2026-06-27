---
name: delx-wellness-daily-operator
description: Run the Delx Wellness daily operator loop for Hermes users.
version: 0.1.0
metadata:
  hermes:
    tags: [daily-operator, wellness, recovery, nutrition, mcp, delx]
    category: wellness
---

# Delx Wellness Daily Operator

## When to Use

Use this when the user asks for today's plan, a daily wellness brief, what to do today, whether to train, what to eat, how to recover, or what setup is missing.

## Operator Loop

1. Read local profile context when available: `wellness-profile.json`, onboarding notes, goals, safety constraints, and preferred language.
2. Check unified context first:
   - If `living_body_status`, `living_body_daily_brief`, or `living_body_compose_context` is available, use it before calling individual providers.
   - Treat Living Body as the preferred composition layer because it merges multiple Delx Wellness connectors without exposing child secrets.
3. If the unified layer is unavailable, check available provider/status tools:
   - Use `*_connection_status`, `*_data_inventory`, `wellness_provider_status`, `wellness_today`, or provider-specific daily summaries when available.
   - Always call setup/status tools before making claims when configuration may be incomplete.
4. Use Nourish as the immediate no-OAuth value path:
   - For food questions, call Nourish estimate/search/coach tools before guessing.
   - Do not log food, water, goals, or saved meals unless the user explicitly asks to save.
5. Build the daily operator answer:
   - One-line operating read.
   - Evidence bullets with provider/source and freshness.
   - Today's training or recovery action.
   - Today's nutrition or hydration action.
   - Missing setup checklist if data is absent or stale.
   - One next command or question that moves the user forward.

## Output Contract

Keep the answer compact enough for terminal or Telegram:

```text
Daily read: ...

Evidence:
- ...
- ...

Do today:
- Training/recovery: ...
- Nutrition/hydration: ...

Missing setup:
- ...

Next: ...
```

If data is unavailable, replace "Evidence" with "Data status" and give the smallest setup action.

## Safety

- This is wellness coaching, not medical advice.
- Do not diagnose, prescribe, or claim to treat conditions.
- Do not encourage training through chest pain, fainting, fever, severe illness, acute injury, or concerning symptoms.
- Do not encourage extreme dieting, dehydration, unsafe supplementation, or disordered eating behavior.
- For high-risk symptoms, medication conflicts, pregnancy context, eating disorder signals, or abnormal readings, be conservative and recommend professional support.

## Privacy

- Never ask the user to paste OAuth tokens, refresh tokens, cookies, API keys, passwords, or raw secret files into chat.
- Never print token paths with secret values.
- Mention local setup commands instead of collecting credentials in conversation.
- Do not send private health context to unrelated tools.

## Verification

The answer is valid only if it either:

- cites at least one real tool/source and freshness signal, or
- clearly states what data is missing and provides the next setup step.
