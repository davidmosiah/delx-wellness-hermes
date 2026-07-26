import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const packageRoot = process.cwd();
const python = spawnSync("python3", ["--version"], { encoding: "utf8" });
const hasPython = python.status === 0;

test("recado context template summarizes recent Nourish food and excludes stale entries", { skip: !hasPython }, async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "recado-context-"));
  const intakePath = path.join(tempDir, "intake.jsonl");
  const scriptPath = path.join(packageRoot, "templates", "recado_context.py");

  const entries = [
    {
      id: "old",
      timestamp: "2026-06-25T22:00:00-03:00",
      meal_type: "dinner",
      food_ref: { source: "estimate", source_id: "pizza", name: "pizza velha" },
      quantity: 1,
      unit: "meal",
      nutrients: { calories_kcal: 1100, protein_g: 35 },
      confidence: 0.7,
      source_trace: "estimate",
      tags: [],
      wellness_context_refs: []
    },
    {
      id: "recent-dinner",
      timestamp: "2026-06-29T21:20:00-03:00",
      meal_type: "dinner",
      food_ref: { source: "taco", source_id: "feijoada", name: "feijoada completa" },
      quantity: 1,
      unit: "meal",
      nutrients: { calories_kcal: 920, protein_g: 42, carbohydrates_g: 88, fat_g: 38 },
      confidence: 0.82,
      source_trace: "estimate",
      notes: "jantar tarde",
      tags: [],
      wellness_context_refs: []
    },
    {
      id: "recent-breakfast",
      date: "2026-06-30",
      meal_type: "breakfast",
      custom_food: { display_name_pt_br: "cuscuz com ovo", name: "corn couscous with egg" },
      quantity: 1,
      unit: "plate",
      nutrients: { calories_kcal: 410, protein_g: 19, carbohydrates_g: 52, fat_g: 13 },
      confidence: 0.76,
      source_trace: "estimate",
      tags: [],
      wellness_context_refs: []
    }
  ];

  await fs.writeFile(intakePath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");

  const run = spawnSync("python3", [scriptPath], {
    cwd: packageRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      RECADO_INTAKE_PATH: intakePath,
      RECADO_NOW: "2026-06-30T11:00:00-03:00",
      RECADO_SKIP_WHOOP: "1",
      RECADO_USER_NAME: "David",
      RECADO_LOCAL_TZ: "America/Fortaleza"
    }
  });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /RECADO_CONTEXT_V1/);
  assert.match(run.stdout, /WHOOP context skipped/);
  assert.match(run.stdout, /feijoada completa/);
  assert.match(run.stdout, /cuscuz com ovo/);
  assert.match(run.stdout, /1330 kcal/);
  assert.doesNotMatch(run.stdout, /pizza velha/);
  assert.match(run.stdout, /confidence=0\.82/);
});

test("recado prompt keeps the production safety contract", async () => {
  const prompt = await fs.readFile(path.join(packageRoot, "templates", "recado_prompt.txt"), "utf8");

  assert.match(prompt, /Do not run syncs/i);
  assert.match(prompt, /do not invent meals/i);
  assert.match(prompt, /Never diagnose/i);
  assert.match(prompt, /at most six short lines/i);
  assert.match(prompt, /food is missing/i);
});
