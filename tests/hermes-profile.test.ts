import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildHermesProfileConfig,
  createOnboardingFile,
  doctorDelxWellnessHermesProfile,
  formatOnboardingQuestions,
  installDelxWellnessHermesProfile,
  mergeHermesConfig,
  parseHermesConfig,
  renderDryRunConfig
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
  assert.ok(servers.polar);
  assert.ok(servers.nourish);
  assert.equal(servers.exercise_catalog, undefined);
  assert.equal(delx.profile_name, "delx-wellness");
  assert.equal(delx.generated_by, "delx-wellness-hermes");
  assert.equal(delx.onboarding?.required, true);
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
  const copiedSkill = await fs.readFile(path.join(hermesHome, "skills", "delx-wellness", "delx-wellness-onboarding", "SKILL.md"), "utf8");

  assert.match(config, /delx-wellness-hermes/);
  assert.match(config, /skills\/delx-wellness/);
  assert.match(soul, /not a doctor/i);
  assert.match(soul, /freshness/i);
  assert.match(agents, /Never print/i);
  assert.match(onboarding, /Devices and Data Sources/i);
  assert.match(copiedSkill, /Delx Wellness Onboarding/i);

  const doctor = await doctorDelxWellnessHermesProfile({ hermesHome, packageRoot });
  assert.equal(doctor.ready, true);
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

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
