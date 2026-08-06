# Verified on Hermes (per release)

On each hermes pack release:

1. Smoke install with pinned npx versions from presets
2. Fail if preset package@version ≠ npm view / release-index
3. Optional README badge only after smoke log

Pins live in generated MCP configs; do not float on latest.
