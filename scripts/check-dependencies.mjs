import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const expectedPins = {
  "@biomejs/biome": "1.9.4",
  "@types/node": "22.5.4",
  dayjs: "1.11.11",
  razorpay: "2.9.0",
  typescript: "5.5.4",
  zod: "3.23.8",
};

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const list = JSON.parse(
  execFileSync("pnpm", ["list", "--depth=0", "--json"], {
    encoding: "utf8",
    env: process.env,
  }),
);

assert.equal(process.version, "v24.18.0");
assert.equal(
  execFileSync("pnpm", ["--version"], {
    encoding: "utf8",
    env: process.env,
  }).trim(),
  "11.15.1",
);
assert.deepEqual(Object.keys(manifest).sort(), [
  "dependencies",
  "name",
  "private",
  "scripts",
  "type",
]);
assert.deepEqual(Object.keys(manifest.dependencies).sort(), Object.keys(expectedPins).sort());

const installed = list[0];
assert.ok(installed);
for (const [name, pin] of Object.entries(expectedPins)) {
  assert.equal(installed.dependencies[name].version, pin, `${name} drifted from its pin`);
}

process.stdout.write("Dependency manifest, lockfile, install, and toolchain agree.\n");
