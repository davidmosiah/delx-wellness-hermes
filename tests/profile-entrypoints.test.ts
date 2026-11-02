import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("real install/uninstall entrypoints preserve fake protected paths (Linux)", {
  skip: process.platform !== "linux" ? "Native Windows/macOS filesystem semantics are not validated by this Linux harness" : false,
  timeout: 120_000
}, () => {
  const runner = fileURLToPath(new URL("./support/run.mjs", import.meta.url));
  const child = spawnSync(process.execPath, [runner], {
    env: { PATH: "", LANG: "C.UTF-8" },
    encoding: "utf8",
    timeout: 110_000,
    maxBuffer: 2 * 1024 * 1024
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr);
  const report = JSON.parse(child.stdout.trim());
  assert.equal(report.platform, "linux");
  assert.equal(report.passed, 61);
  assert.equal(report.results.length, 61);
  assert.ok(report.results.every((row: { status: string }) => row.status === "PASS"));
});
