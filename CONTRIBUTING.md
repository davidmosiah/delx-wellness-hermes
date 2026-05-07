# Contributing

Contributions are welcome around Hermes setup reliability, onboarding, profile checks, skills, docs and connector preset quality.

## Local development

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run install:dry-run
npm run doctor
```

## Design rules

- Keep setup idempotent and safe to re-run.
- Never commit local Hermes profiles, model credentials, OAuth secrets, MCP tokens or personal health data.
- Use Nourish as the no-OAuth smoke path where possible.
- Keep instructions English-first unless a specific localization is being tested.
- Update the Delx Wellness registry/docs when connector behavior changes materially.

## Pull request checklist

- `npm run typecheck` passes.
- `npm run build` passes.
- `npm test` passes.
- `npm run install:dry-run` passes when setup/profile files change.
- README/setup docs are updated when behavior changes.
