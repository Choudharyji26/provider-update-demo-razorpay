import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const sourceRoot = process.cwd();
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "provider-update-demo-pack-"));
const excluded = [path.join(sourceRoot, ".git"), path.join(sourceRoot, "node_modules")];

let packed;
try {
  await cp(sourceRoot, temporaryRoot, {
    recursive: true,
    filter(source) {
      return excluded.every(
        (entry) => source !== entry && !source.startsWith(`${entry}${path.sep}`),
      );
    },
  });
  const manifest = JSON.parse(await readFile(path.join(temporaryRoot, "package.json"), "utf8"));
  await writeFile(
    path.join(temporaryRoot, "package.json"),
    `${JSON.stringify({ ...manifest, version: "0.0.0-seed" }, null, 2)}\n`,
  );
  const result = JSON.parse(
    execFileSync("pnpm", ["pack", "--dry-run", "--json"], {
      cwd: temporaryRoot,
      encoding: "utf8",
      env: process.env,
    }),
  );
  packed = Array.isArray(result) ? result[0] : result;
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}

assert.ok(packed);

const actual = packed.files.map((file) => file.path).sort();
const expected = [
  "README.md",
  "package.json",
  "seed-manifest.json",
  "src/invoices/draft-invoice.ts",
  "src/payments/settle-payment.ts",
  "src/refunds/refund-status.ts",
  "src/webhooks/verify-signature.ts",
];
assert.deepEqual(actual, expected);
assert.equal(
  actual.some((path) => path.startsWith("tests/") || path.startsWith("scripts/")),
  false,
);

process.stdout.write(`Package dry run contains ${actual.length} allowlisted files.\n`);
