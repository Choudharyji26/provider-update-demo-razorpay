import assert from "node:assert/strict";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ignoredDirectories = new Set([".git", "node_modules"]);
const patterns = [
  new RegExp(`${["s", "k"].join("")}_${"(?:test|live)"}_[A-Za-z0-9]{8,}`, "u"),
  new RegExp(`${["r", "k"].join("")}_${"(?:test|live)"}_[A-Za-z0-9]{8,}`, "u"),
  new RegExp(`${["w", "h", "s", "e", "c"].join("")}_[A-Za-z0-9]{8,}`, "u"),
  new RegExp(`${["g", "h", "p"].join("")}_[A-Za-z0-9]{20,}`, "u"),
  new RegExp(
    `${["g", "i", "t", "h", "u", "b", "_", "p", "a", "t"].join("")}_[A-Za-z0-9_]{20,}`,
    "u",
  ),
  new RegExp(`${["x", "o", "x", "b"].join("")}-[A-Za-z0-9-]{12,}`, "u"),
  new RegExp(`${["r", "e"].join("")}_[A-Za-z0-9]{20,}`, "u"),
  new RegExp(`${["A", "K", "I", "A"].join("")}[A-Z0-9]{16}`, "u"),
  new RegExp(`${["A", "S", "I", "A"].join("")}[A-Z0-9]{16}`, "u"),
  new RegExp(`${["n", "p", "m"].join("")}_[A-Za-z0-9]{36}`, "u"),
  new RegExp(`${["g", "l", "p", "a", "t"].join("")}-[A-Za-z0-9_-]{20,}`, "u"),
  new RegExp(`\\b${["Y", "O", "U", "R"].join("")}_(?:API_KEY|TOKEN|SECRET|PASSWORD)\\b`, "u"),
  new RegExp(
    `${["B", "E", "G", "I", "N"].join("")} (?:RSA |EC |OPENSSH )?${["P", "R", "I", "V", "A", "T", "E"].join("")} ${["K", "E", "Y"].join("")}`,
    "u",
  ),
];

async function files(directory) {
  const result = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await files(item)));
    } else if (entry.isFile()) {
      result.push(item);
    } else {
      assert.fail(`Non-regular repository entry: ${item}`);
    }
  }
  return result;
}

const repositoryFiles = await files(".");
for (const file of repositoryFiles) {
  const entry = await lstat(file);
  assert.ok(entry.size <= 16 * 1024 * 1024, `Oversized file: ${file}`);
  const content = await readFile(file, "utf8");
  for (const pattern of patterns) {
    assert.equal(pattern.test(content), false, `Secret-shaped content in ${file}`);
  }
}

process.stdout.write(
  `No configured credential prefixes, private-key blocks, or obvious secret placeholders found in ${repositoryFiles.length} files.\n`,
);
