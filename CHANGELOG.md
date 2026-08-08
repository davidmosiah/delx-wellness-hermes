## 0.3.6 - 2026-08-06

### Changed
- Pin `garmin-mcp-unofficial@0.7.2` (Body Battery daily report fix #20).

## 0.3.5 - 2026-08-05

### Changed
- Pin matrix: garmin 0.7.1, strava/fitbit 0.6.0, polar 0.5.0, whoop 0.6.1, google-health 0.7.3.
- Training skill prefers agent-safe-series tools over raw dense dumps.

## Unreleased

### Changed
- Pin matrix: garmin 0.7.1, strava 0.6.0, fitbit 0.6.0, whoop 0.6.1, polar 0.4.1, google-health 0.7.3.


## 0.3.4 - 2026-08-04

### Changed
- Refresh public connector `packageVersion` pins to current npm latest (Google Health **0.7.3**, nourish **0.8.0**, whoop **0.6.0**, garmin **0.7.0**, and the rest of the fleet). Generated Hermes `mcp_servers` configs now install known-good SOTA builds instead of stale 0.5.x pins.

## 0.3.3 - 2026-07-30

### Changed

- Pin matrix SOTA wave: fleet connectors at scorecard 100 (whoop/google-health 0.5.7, oura/strava/fitbit/withings 0.4.11, polar 0.3.14, apple/samsung 0.5.1, nourish 0.7.3, etc.).

## 0.3.2 - 2026-07-30

### Security

- Supply chain: pin public connector npx installs to package@version (OpenClaw parity with Hermes).

### Changed

- Pin public wellness MCP packages to known-good npm versions in generated Hermes `mcp_servers` configs (`npx -y pkg@version`) for reproducible agent installs.

## 0.3.1 - 2026-07-30

# Changelog
