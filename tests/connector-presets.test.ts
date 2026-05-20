import assert from "node:assert/strict";
import test from "node:test";
import {
  CONNECTOR_PRESETS,
  buildLocalMcpServerConfig,
  defaultConnectorIds,
  getConnectorPreset,
  liteConnectorIds,
  type ConnectorId,
  type ConnectorPreset
} from "../src/connector-presets.ts";

const EXPECTED_CONNECTOR_IDS: ConnectorId[] = [
  "whoop",
  "garmin",
  "oura",
  "strava",
  "fitbit",
  "google_health",
  "withings",
  "apple_health",
  "samsung_health",
  "polar",
  "eight_sleep",
  "nourish",
  "wellness_air",
  "wellness_cycle_coach",
  "wellness_cgm",
  "exercise_catalog"
];

test("CONNECTOR_PRESETS contains all 16 expected connector IDs", () => {
  const actualIds = CONNECTOR_PRESETS.map((p) => p.id);
  for (const expected of EXPECTED_CONNECTOR_IDS) {
    assert.ok(
      actualIds.includes(expected),
      `Missing connector preset: ${expected}. The full Delx Wellness ecosystem expects all 15 npm-published connectors + exercise-catalog (private) wired into Hermes.`
    );
  }
  assert.equal(
    actualIds.length,
    EXPECTED_CONNECTOR_IDS.length,
    `CONNECTOR_PRESETS length=${actualIds.length} but expected ${EXPECTED_CONNECTOR_IDS.length}. Unexpected ids: ${actualIds.filter((id) => !EXPECTED_CONNECTOR_IDS.includes(id)).join(", ")}`
  );
});

test("Every preset has the required shape and non-empty fields", () => {
  for (const preset of CONNECTOR_PRESETS) {
    assert.ok(preset.id, `Preset missing id: ${JSON.stringify(preset)}`);
    assert.ok(preset.displayName?.length > 0, `Preset ${preset.id} missing displayName`);
    assert.ok(
      ["physiology", "activity", "nutrition", "exercise"].includes(preset.category),
      `Preset ${preset.id} has invalid category: ${preset.category}`
    );
    assert.ok(
      ["local-first", "oauth-local-token", "private-catalog"].includes(preset.privacy),
      `Preset ${preset.id} has invalid privacy: ${preset.privacy}`
    );
    assert.ok(preset.notes?.length > 0, `Preset ${preset.id} missing notes`);
    assert.equal(typeof preset.enabledByDefault, "boolean");

    // Public connectors (everything except exercise_catalog) MUST declare packageName + binaryName
    if (preset.id !== "exercise_catalog") {
      assert.ok(
        preset.packageName?.length > 0,
        `Public preset ${preset.id} missing packageName — agents need this to npx -y the connector`
      );
      assert.ok(preset.binaryName?.length > 0, `Public preset ${preset.id} missing binaryName`);
    }
  }
});

test("getConnectorPreset returns each known id; throws for unknown", () => {
  for (const id of EXPECTED_CONNECTOR_IDS) {
    const preset = getConnectorPreset(id);
    assert.equal(preset.id, id);
  }
  assert.throws(() => getConnectorPreset("nonexistent-connector-id" as ConnectorId), /Unknown connector preset/);
});

test("defaultConnectorIds() returns a non-empty subset of CONNECTOR_PRESETS ids", () => {
  const defaults = defaultConnectorIds();
  assert.ok(defaults.length > 0, "defaultConnectorIds() must not be empty");
  const allIds = CONNECTOR_PRESETS.map((p) => p.id);
  for (const id of defaults) {
    assert.ok(allIds.includes(id), `defaultConnectorIds returned unknown id: ${id}`);
  }
});

test("liteConnectorIds() returns only ids present in CONNECTOR_PRESETS", () => {
  const lite = liteConnectorIds();
  assert.ok(lite.length > 0, "liteConnectorIds() must not be empty");
  const allIds = CONNECTOR_PRESETS.map((p) => p.id);
  for (const id of lite) {
    assert.ok(allIds.includes(id), `liteConnectorIds returned unknown id: ${id}`);
  }
});

test("buildLocalMcpServerConfig returns valid {command, args} shape for public connectors", () => {
  for (const preset of CONNECTOR_PRESETS) {
    const cfg = buildLocalMcpServerConfig(preset);
    if (!preset.packageName) {
      assert.equal(cfg, undefined, `Preset ${preset.id} has no packageName, expected undefined config`);
      continue;
    }
    assert.ok(cfg, `Public preset ${preset.id} returned undefined config`);
    assert.equal(cfg!.command, "npx");
    assert.ok(Array.isArray(cfg!.args), `Preset ${preset.id} config.args must be an array`);
    assert.ok(cfg!.args!.includes(preset.packageName), `Preset ${preset.id} args missing packageName`);
    assert.ok(cfg!.args!.includes("-y"), `Preset ${preset.id} args missing -y flag (non-interactive npx)`);
  }
});

test("Categories cover the wellness ecosystem (physiology + nutrition at minimum)", () => {
  const categories = new Set(CONNECTOR_PRESETS.map((p) => p.category));
  assert.ok(categories.has("physiology"), "Missing physiology category");
  assert.ok(categories.has("nutrition"), "Missing nutrition category");
});

test("Privacy posture: no public connector ships as 'private-catalog'", () => {
  for (const preset of CONNECTOR_PRESETS) {
    if (preset.id !== "exercise_catalog") {
      assert.notEqual(
        preset.privacy,
        "private-catalog",
        `Public connector ${preset.id} cannot use private-catalog privacy posture — that is reserved for exercise_catalog only`
      );
    }
  }
});

test("Default-enabled connectors should all be local-first or oauth-local-token (no private)", () => {
  for (const preset of CONNECTOR_PRESETS) {
    if (preset.enabledByDefault) {
      assert.notEqual(
        preset.privacy,
        "private-catalog",
        `${preset.id} is enabledByDefault but uses private-catalog — would break setup for users without private access`
      );
    }
  }
});

test("Sensitive connectors (cycle, cgm, eight-sleep, air) are NOT enabled by default", () => {
  // These require either: medical-adjacent care (cycle, cgm), hardware (air),
  // or specific subscription (eight-sleep). They should be opt-in.
  const sensitive: ConnectorId[] = ["wellness_cycle_coach", "wellness_cgm", "eight_sleep", "wellness_air"];
  for (const id of sensitive) {
    const preset = getConnectorPreset(id);
    assert.equal(
      preset.enabledByDefault,
      false,
      `${id} should be off by default (sensitive/requires-hardware/requires-subscription connector)`
    );
  }
});
