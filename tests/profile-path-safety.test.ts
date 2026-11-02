import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertProfileName, assertSafeProfileMutation, assertNotSymlink } from "../src/profile-path-safety.js";

// Synthetic fixtures only. Never invoke installer/uninstaller or recursive rm.
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hermes-path-v2-"));
  const user = path.join(root, "user");
  const profiles = path.join(user, ".hermes", "profiles");
  await fs.mkdir(profiles, { recursive: true });
  return { root, user, profiles };
}

test("preserves Unicode, internal spaces, underscore, hyphen and dots", () => {
  for (const name of ["delx-wellness", "work_2", "a.b", "Meu perfil", "João", "健康", "profilé", "default"]) {
    assert.doesNotThrow(() => assertProfileName(name, "linux"));
    assert.doesNotThrow(() => assertProfileName(name, "win32"));
  }
});

test("rejects non-segments and controls on every platform", () => {
  for (const name of ["", ".", "..", "../..", "/tmp", "a/b", "a\\b", "a\0b", "a\nb", "a\r", "a\r\n", "a\u0085b", "a\u2028", "a\u2029"]) {
    for (const platform of ["linux", "darwin", "win32"]) assert.throws(() => assertProfileName(name, platform));
  }
});

test("Windows aliases are rejected only on Windows; valid POSIX names retained", () => {
  for (const name of ["CON", "con.txt", "NUL", "LPT1", "COM¹", "a.", "a ", "...", "C:foo", "a?b"]) {
    assert.throws(() => assertProfileName(name, "win32"));
    assert.doesNotThrow(() => assertProfileName(name, "linux"));
  }
});

test("default-derived profile is contained, including Unicode and missing leaf", async () => {
  const { user, profiles } = await fixture();
  for (const name of ["delx-wellness", "Meu perfil", "João"]) await assertSafeProfileMutation(name, path.join(profiles, name), false, user);
  await assert.rejects(assertSafeProfileMutation("..", path.dirname(profiles), false, user));
  await assert.rejects(assertSafeProfileMutation("valid", path.join(user, "outside"), false, user));
  await assert.rejects(assertSafeProfileMutation("default", path.join(profiles, "default"), false, user));
});

test("explicit custom layout and external skills target remain caller-authorized", async () => {
  const { root, user } = await fixture();
  await assertSafeProfileMutation("Meu perfil", path.join(root, "custom layout"), true, user);
  await assertSafeProfileMutation("Meu perfil", path.join(root, "shared-skills"), true, user);
});

test("explicit overrides cannot target HOME/default/root or ancestors", async () => {
  const { root, user } = await fixture();
  for (const target of [user, root, path.join(user, ".hermes"), path.parse(root).root]) await assert.rejects(assertSafeProfileMutation("valid", target, true, user));
});

test("rejects profile leaf and profiles-parent symlinks without following deletion", async () => {
  const first = await fixture();
  const outside = path.join(first.root, "outside");
  await fs.mkdir(outside);
  await fs.symlink(outside, path.join(first.profiles, "safe"), "dir");
  await assert.rejects(assertSafeProfileMutation("safe", path.join(first.profiles, "safe"), false, first.user), /symlinked/);
  const second = await fixture();
  const otherHome = path.join(second.root, "other-home");
  await fs.mkdir(path.join(otherHome, ".hermes"), { recursive: true });
  await fs.symlink(outside, path.join(otherHome, ".hermes", "profiles"), "dir");
  await assert.rejects(assertSafeProfileMutation("safe", path.join(otherHome, ".hermes", "profiles", "safe"), false, otherHome), /symlinked/);
});

test("canonical containment blocks aliases to default while allowing OS-style home symlinks", async () => {
  const { root, user } = await fixture();
  const alias = path.join(root, "home-alias");
  await fs.symlink(user, alias, "dir");
  await assert.rejects(assertSafeProfileMutation("safe", path.join(alias, ".hermes"), true, user));
  await assertSafeProfileMutation("safe", path.join(alias, ".hermes", "profiles", "safe"), false, alias);
});

test("rejects dangling config links; failed validation leaves sentinel untouched", async () => {
  const { root, user } = await fixture();
  const sentinel = path.join(user, ".hermes", "KEEP");
  await fs.writeFile(sentinel, "synthetic sentinel", "utf8");
  const config = path.join(root, "config.yaml");
  await fs.symlink(path.join(root, "nonexistent-secret"), config);
  await assert.rejects(assertNotSymlink(config));
  await assert.rejects(assertSafeProfileMutation("..", path.join(user, ".hermes"), false, user));
  assert.equal(await fs.readFile(sentinel, "utf8"), "synthetic sentinel");
});

test("operator-configured Hermes root relocation is trusted but its root remains protected", async () => {
  const { root } = await fixture();
  const user = path.join(root, "relocated-user");
  const relocated = path.join(root, "relocated-hermes");
  await fs.mkdir(user);
  await fs.mkdir(path.join(relocated, "profiles"), { recursive: true });
  await fs.symlink(relocated, path.join(user, ".hermes"), "dir");
  await assertSafeProfileMutation("Meu perfil", path.join(user, ".hermes", "profiles", "Meu perfil"), false, user);
  await assert.rejects(assertSafeProfileMutation("safe", relocated, true, user));
});
