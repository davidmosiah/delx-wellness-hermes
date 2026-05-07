import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildHermesProfileConfig,
  createOnboardingFile,
  DEFAULT_WELLNESS_PROFILE,
  doctorDelxWellnessHermesProfile,
  formatOnboardingQuestions,
  installDelxWellnessHermesProfile,
  liteConnectorIds,
  mergeHermesConfig,
  parseHermesConfig,
  renderDryRunConfig,
  runDelxWellnessE2E,
  setupDelxWellnessHermes
} from "../src/index.ts";

const packageRoot = process.cwd();

test("Hermes profile config includes Delx Wellness skills, onboarding, and default local connectors", () => {
  const config = buildHermesProfileConfig({
    profileName: "delx-wellness",
    skillsDir: "/opt/delx-wellness-hermes/skills"
  });

  const skills = config.skills as { external_dirs?: string[] };
  const servers = config.mcp_servers as Record<string, unknown>;
  const delx = config.delx_wellness as { profile_name?: string; generated_by?: string; onboarding?: { required?: boolean } };

  assert.deepEqual(skills.external_dirs, ["/opt/delx-wellness-hermes/skills"]);
  assert.ok(servers.whoop);
  assert.ok(servers.garmin);
  assert.ok(servers.oura);
  assert.ok(servers.strava);
  assert.ok(servers.fitbit);
  assert.ok(servers.withings);
  assert.ok(servers.apple_health);
  assert.ok(servers.samsung_health);
  assert.ok(servers.polar);
  assert.ok(servers.nourish);
  assert.equal(servers.exercise_catalog, undefined);
  assert.equal(delx.profile_name, "delx-wellness");
  assert.equal(delx.generated_by, "delx-wellness-hermes");
  assert.equal(delx.onboarding?.required, true);
});

test("lite connector mode installs only the fast core connectors", () => {
  const config = buildHermesProfileConfig({
    profileName: "delx-wellness",
    skillsDir: "/opt/delx-wellness-hermes/skills",
    connectorMode: "lite"
  });

  const servers = config.mcp_servers as Record<string, unknown>;
  const delx = config.delx_wellness as {
    connector_mode?: string;
    connectors?: Array<{ id: string; enabled: boolean }>;
  };

  assert.deepEqual(Object.keys(servers), liteConnectorIds());
  assert.equal(delx.connector_mode, "lite");
  assert.equal(delx.connectors?.find((connector) => connector.id === "garmin")?.enabled, true);
  assert.equal(delx.connectors?.find((connector) => connector.id === "nourish")?.enabled, true);
  assert.equal(delx.connectors?.find((connector) => connector.id === "whoop")?.enabled, false);
});

test("explicit connector list overrides connector mode", () => {
  const config = buildHermesProfileConfig({
    skillsDir: "/opt/delx/skills",
    connectorMode: "lite",
    connectorIds: ["whoop", "oura", "nourish"]
  });
  const servers = config.mcp_servers as Record<string, unknown>;
  const delx = config.delx_wellness as { connector_mode?: string };

  assert.deepEqual(Object.keys(servers), ["whoop", "oura", "nourish"]);
  assert.equal(delx.connector_mode, "custom");
});

test("Hermes profile config merges idempotently and preserves unrelated settings", () => {
  const existing = parseHermesConfig(`
model: openai/gpt-5.2
skills:
  external_dirs:
    - /existing/skills
mcp_servers:
  github:
    command: gh-mcp
`);
  const generated = buildHermesProfileConfig({
    skillsDir: "/opt/delx/skills",
    connectorIds: ["whoop", "nourish"]
  });

  const merged = mergeHermesConfig(existing, generated);
  const mergedAgain = mergeHermesConfig(merged, generated);
  const skills = mergedAgain.skills as { external_dirs?: string[] };
  const servers = mergedAgain.mcp_servers as Record<string, unknown>;

  assert.equal(mergedAgain.model, "openai/gpt-5.2");
  assert.deepEqual(skills.external_dirs, ["/existing/skills", "/opt/delx/skills"]);
  assert.ok(servers.github);
  assert.ok(servers.whoop);
  assert.ok(servers.nourish);
});

test("dry-run output redacts secret-like fields", () => {
  const rendered = renderDryRunConfig({
    mcp_servers: {
      delx_wellness_hub: {
        url: "https://example.test/mcp",
        headers: {
          Authorization: "Bearer secret-token-value"
        }
      }
    },
    api_key: "secret-api-key"
  });

  assert.match(rendered, /redacted/);
  assert.equal(rendered.includes("secret-token-value"), false);
  assert.equal(rendered.includes("secret-api-key"), false);
});

test("hosted mode requires an explicit hub URL", () => {
  assert.throws(
    () => buildHermesProfileConfig({
      skillsDir: "/opt/delx-wellness-hermes/skills",
      mode: "hosted"
    }),
    /requires --hub-url/i
  );

  const config = buildHermesProfileConfig({
    skillsDir: "/opt/delx-wellness-hermes/skills",
    mode: "hosted",
    hubUrl: "https://private.example.test/mcp"
  });
  const servers = config.mcp_servers as { delx_wellness_hub?: { url?: string } };
  assert.equal(servers.delx_wellness_hub?.url, "https://private.example.test/mcp");
});

test("installer write creates public-safe Hermes profile files", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delx-wellness-hermes-"));
  const hermesHome = path.join(tempDir, ".hermes", "profiles", "delx-wellness");

  await installDelxWellnessHermesProfile({ hermesHome, packageRoot, write: true });

  const config = await fs.readFile(path.join(hermesHome, "config.yaml"), "utf8");
  const soul = await fs.readFile(path.join(hermesHome, "SOUL.md"), "utf8");
  const agents = await fs.readFile(path.join(hermesHome, "AGENTS.md"), "utf8");
  const onboarding = await fs.readFile(path.join(hermesHome, "ONBOARDING.md"), "utf8");
  const wellnessProfile = JSON.parse(await fs.readFile(path.join(hermesHome, "wellness-profile.json"), "utf8")) as typeof DEFAULT_WELLNESS_PROFILE;
  const copiedSkill = await fs.readFile(path.join(hermesHome, "skills", "delx-wellness", "delx-wellness-onboarding", "SKILL.md"), "utf8");

  assert.match(config, /delx-wellness-hermes/);
  assert.match(config, /skills\/delx-wellness/);
  assert.match(soul, /not a doctor/i);
  assert.match(soul, /freshness/i);
  assert.match(agents, /Never print/i);
  assert.match(onboarding, /Devices and Data Sources/i);
  assert.equal(wellnessProfile.schema, "delx-wellness-profile/v1");
  assert.deepEqual(wellnessProfile.preferences.language_priority, ["en", "pt-BR"]);
  assert.match(copiedSkill, /Delx Wellness Onboarding/i);

  const doctor = await doctorDelxWellnessHermesProfile({ hermesHome, packageRoot });
  assert.equal(doctor.ready, true);
});

test("doctor test-chat surfaces missing Hermes inference provider", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delx-wellness-hermes-doctor-"));
  const hermesHome = path.join(tempDir, ".hermes", "profiles", "delx-wellness");
  const hermesBinary = path.join(tempDir, "fake-hermes");

  await installDelxWellnessHermesProfile({ hermesHome, packageRoot, write: true });
  await fs.writeFile(hermesBinary, `#!/usr/bin/env bash
if [[ "$*" == "--version" ]]; then
  echo "Hermes Agent v0.12.0"
  exit 0
fi
if [[ "$*" == "-p delx-wellness mcp list" ]]; then
  echo "MCP Servers:"
  exit 0
fi
if [[ "$*" == *"-z"* ]]; then
  echo "No inference provider configured" >&2
  exit 1
fi
exit 2
`, "utf8");
  await fs.chmod(hermesBinary, 0o755);

  const doctor = await doctorDelxWellnessHermesProfile({
    hermesHome,
    packageRoot,
    runHermes: true,
    hermesBinary,
    testChat: true
  });

  assert.equal(doctor.ready, false);
  assert.equal(doctor.checks.find((check) => check.id === "hermes_chat_runtime")?.ok, false);
  assert.match(doctor.checks.find((check) => check.id === "hermes_chat_runtime")?.message ?? "", /No inference provider configured/i);
});

test("setup command writes the wellness profile and runs Hermes checks when available", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delx-wellness-hermes-setup-"));
  const hermesHome = path.join(tempDir, ".hermes", "profiles", "delx-wellness");
  const hermesBinary = path.join(tempDir, "fake-hermes");

  await fs.writeFile(hermesBinary, `#!/usr/bin/env bash
if [[ "$*" == "--version" ]]; then
  echo "Hermes Agent v0.12.0"
  exit 0
fi
if [[ "$*" == "-p delx-wellness mcp list" ]]; then
  echo "MCP Servers:"
  exit 0
fi
exit 2
`, "utf8");
  await fs.chmod(hermesBinary, 0o755);

  const setup = await setupDelxWellnessHermes({
    hermesHome,
    packageRoot,
    hermesBinary,
    skipSmoke: true
  });

  assert.equal(setup.dryRun, false);
  assert.equal(setup.hermesDetected, true);
  assert.equal(setup.doctor?.ready, true);
  assert.match(setup.nextSteps.join("\n"), /hermes -p delx-wellness model/);
  assert.equal(await exists(path.join(hermesHome, "config.yaml")), true);
});

test("onboarding command model covers profile, goals, devices, nutrition, exercise, and safety", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delx-wellness-onboarding-"));
  const hermesHome = path.join(tempDir, ".hermes", "profiles", "delx-wellness");

  const result = await createOnboardingFile({ hermesHome, packageRoot, write: true });
  const prompts = formatOnboardingQuestions(result.questions);

  assert.equal(result.written, true);
  assert.equal(await exists(result.onboardingPath), true);
  assert.match(prompts, /WHOOP, Garmin, Oura/i);
  assert.match(prompts, /nutrition/i);
  assert.match(prompts, /injuries/i);
});

test("onboarding supports global English default and pt-BR output", async () => {
  const english = formatOnboardingQuestions(undefined, { language: "en" });
  const portuguese = formatOnboardingQuestions(undefined, { language: "pt-BR" });

  assert.match(english, /What should the agent call you/i);
  assert.match(english, /WHOOP, Garmin, Oura/i);
  assert.match(portuguese, /Como o agente deve te chamar/i);
  assert.match(portuguese, /lesões/i);
});

test("doctor honors lite profiles and reports wellness profile presence", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delx-wellness-hermes-lite-"));
  const hermesHome = path.join(tempDir, ".hermes", "profiles", "delx-wellness");

  await installDelxWellnessHermesProfile({
    hermesHome,
    packageRoot,
    connectorMode: "lite",
    write: true
  });

  const doctor = await doctorDelxWellnessHermesProfile({ hermesHome, packageRoot });

  assert.equal(doctor.ready, true);
  assert.deepEqual(doctor.configuredConnectors, ["garmin", "nourish"]);
  assert.deepEqual(doctor.missingDefaultConnectors, []);
  assert.equal(doctor.checks.find((check) => check.id === "wellness_profile")?.ok, true);
  assert.match(doctor.checks.find((check) => check.id === "mcp_connectors")?.message ?? "", /lite/i);
});

test("E2E runner uses safe onboarding prompt through Hermes", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delx-wellness-hermes-e2e-"));
  const hermesHome = path.join(tempDir, ".hermes", "profiles", "delx-wellness");
  const hermesBinary = path.join(tempDir, "fake-hermes");

  await installDelxWellnessHermesProfile({
    hermesHome,
    packageRoot,
    connectorMode: "lite",
    write: true
  });
  await fs.writeFile(hermesBinary, `#!/usr/bin/env bash
if [[ "$*" == "--version" ]]; then
  echo "Hermes Agent v0.12.0"
  exit 0
fi
if [[ "$*" == "-p delx-wellness mcp list" ]]; then
  echo "MCP Servers:"
  exit 0
fi
if [[ "$*" == "-p delx-wellness mcp test nourish" ]]; then
  echo "Tools discovered: 23"
  exit 0
fi
if [[ "$*" == *"-z"* ]]; then
  echo "E2E wellness answer: onboarding, connector status, training, nutrition, QA notes"
  exit 0
fi
exit 2
`, "utf8");
  await fs.chmod(hermesBinary, 0o755);

  const report = await runDelxWellnessE2E({
    hermesHome,
    packageRoot,
    hermesBinary,
    profileName: "delx-wellness",
    testConnectors: ["nourish"]
  });

  assert.equal(report.ready, true);
  assert.match(report.response, /E2E wellness answer/);
  assert.match(report.prompt, /Do not revoke/i);
  assert.match(report.prompt, /QA notes/i);
});

test("E2E runner keeps useful Hermes answers when the process exits non-zero", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "delx-wellness-hermes-e2e-partial-"));
  const hermesHome = path.join(tempDir, ".hermes", "profiles", "delx-wellness");
  const hermesBinary = path.join(tempDir, "fake-hermes");

  await installDelxWellnessHermesProfile({
    hermesHome,
    packageRoot,
    connectorMode: "lite",
    write: true
  });
  await fs.writeFile(hermesBinary, `#!/usr/bin/env bash
if [[ "$*" == "--version" ]]; then
  echo "Hermes Agent v0.12.0"
  exit 0
fi
if [[ "$*" == "-p delx-wellness mcp list" ]]; then
  echo "MCP Servers:"
  exit 0
fi
if [[ "$*" == "-p delx-wellness mcp test nourish" ]]; then
  echo "Tools discovered: 23"
  exit 0
fi
if [[ "$*" == *"-z"* ]]; then
  echo "Connector status checked. Next safest setup step: fill wellness-profile.json."
  exit 1
fi
exit 2
`, "utf8");
  await fs.chmod(hermesBinary, 0o755);

  const report = await runDelxWellnessE2E({
    hermesHome,
    packageRoot,
    hermesBinary,
    profileName: "delx-wellness",
    testConnectors: ["nourish"]
  });

  assert.equal(report.ready, true);
  assert.match(report.response, /Next safest setup step/i);
  assert.match(report.error ?? "", /Next safest setup step/i);
});

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
