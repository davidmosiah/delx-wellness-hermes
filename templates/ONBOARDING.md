# Delx Wellness Hermes Onboarding

This onboarding helps the agent understand the user's body context, goals, devices, and constraints without collecting medical claims.

Default to English for the global agent market. Use pt-BR when the user asks for it or has `pt-BR` in `wellness-profile.json`.

Store the final non-secret preferences in `wellness-profile.json`. Never store OAuth tokens, cookies, API keys, refresh tokens, or raw provider secrets in this file.

## Profile Basics

- Preferred name:
- Locale/language:
- Timezone:
- Units: metric / imperial
- Gender identity or biological sex if relevant to wellness interpretation:
- Age or birth year:
- Height:
- Weight:

## Goals

- Primary goal:
- Secondary goals:
- Training focus:
- Recovery focus:
- Nutrition focus:
- Sleep focus:
- Current biggest friction:

## Devices and Data Sources

Check everything the user has or wants to connect:

- WHOOP
- Garmin
- Oura
- Strava
- Fitbit
- Google Health
- Withings
- Apple Health
- Polar
- Nourish / nutrition logs
- Exercise Catalog

## Activity Context

- Main sports:
- Weekly training schedule:
- Current average steps:
- Strength training frequency:
- Cardio frequency:
- Mobility or recovery work:
- Upcoming event or deadline:

## Nutrition Context

- Typical breakfast:
- Typical lunch:
- Typical dinner:
- Snacks:
- Hydration:
- Dietary preferences:
- Food restrictions or allergies:
- Calorie or macro goal if known:

## Exercise Preferences

- Available equipment:
- Training location:
- Preferred workout duration:
- Exercises to avoid:
- Injuries, pain, or limitations:

## Agent Preferences

- Preferred response length:
- Preferred language:
- Telegram style: concise / detailed
- Ask before logging food: yes / no
- Include exercise videos when available: yes / no

## Safety Reminder

This profile is for wellness context and daily decision support. It is not a medical record and does not replace medical, nutrition, or training professionals.
