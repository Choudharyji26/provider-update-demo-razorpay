import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const manifest = JSON.parse(await readFile("seed-manifest.json", "utf8"));
const packageManifest = JSON.parse(await readFile("package.json", "utf8"));

assert.equal(manifest.schema, "pramaan/provider-update-demo-seed/v1");
assert.deepEqual(manifest.repository, {
  owner: "Pramaan-Dev",
  name: "provider-update-demo-razorpay",
  remote: "https://github.com/Pramaan-Dev/provider-update-demo-razorpay.git",
  baseRef: "main",
  headPattern: "product-loop/live-demo-*",
});

assert.equal(manifest.baseline.node, "24.18.0");
assert.equal(manifest.baseline.packageManager, "pnpm@11.15.1");
assert.equal(manifest.baseline.verificationCommand, "pnpm test");
assert.equal(await readFile(".node-version", "utf8"), `${manifest.baseline.node}\n`);
assert.equal(await readFile(".nvmrc", "utf8"), `${manifest.baseline.node}\n`);
assert.equal(
  await readFile(".tool-versions", "utf8"),
  `nodejs ${manifest.baseline.node}\npnpm 11.15.1\n`,
);

assert.deepEqual(Object.keys(packageManifest.dependencies).sort(), [
  "@biomejs/biome",
  "@types/node",
  "dayjs",
  "razorpay",
  "typescript",
  "zod",
]);
for (const [name, requirement] of Object.entries(manifest.baseline.dependencies)) {
  if (name === "razorpay") continue;
  assert.equal(
    packageManifest.dependencies[name],
    requirement,
    `Unexpected baseline drift for ${name}`,
  );
}
assert.ok(
  [
    manifest.baseline.dependencies.razorpay,
    manifest.expectedUpdate.targetRazorpayRequirement,
  ].includes(packageManifest.dependencies.razorpay),
  "razorpay requirement must match the baseline pin or the expected update target",
);

assert.equal(manifest.expectedUpdate.hero, "razorpay upgrade to 2.9.8-era current release");
assert.equal(manifest.expectedUpdate.targetRazorpayRequirement, "^2.9.8");

const testPaths = [
  "tests/draft-invoice.test.ts",
  "tests/refund-status.test.ts",
  "tests/settle-payment.test.ts",
  "tests/verify-signature.test.ts",
];
assert.deepEqual(manifest.baseline.testPaths, testPaths);
for (const file of testPaths) {
  assert.ok((await lstat(file)).isFile(), `Missing declared test path: ${file}`);
}

const affected = manifest.expectedUpdate.affectedPaths;
const untouched = manifest.expectedUpdate.untouchedPaths;
assert.deepEqual(affected, ["src/payments/settle-payment.ts", "src/refunds/refund-status.ts"]);
assert.deepEqual(untouched, ["src/invoices/draft-invoice.ts", "src/webhooks/verify-signature.ts"]);
assert.deepEqual(manifest.expectedUpdate.automaticPatchPaths, ["package.json"]);
assert.deepEqual(manifest.expectedUpdate.manualVerificationPaths, [
  "pnpm-lock.yaml",
  "tests/refund-status.test.ts",
  "tests/settle-payment.test.ts",
  "tests/support/razorpay.ts",
]);
assert.equal(
  affected.some((filePath) => untouched.includes(filePath)),
  false,
);

await lstat("pnpm-lock.yaml");

const settlementSource = await readFile("src/payments/settle-payment.ts", "utf8");
assert.match(settlementSource, /capture\.captured/u);
assert.match(settlementSource, /completionClaimed: false/u);

const refundSource = await readFile("src/refunds/refund-status.ts", "utf8");
assert.match(refundSource, /"processed"/u);

const draftSource = await readFile("src/invoices/draft-invoice.ts", "utf8");
assert.match(draftSource, /from "zod"/u);
assert.match(draftSource, /from "dayjs"/u);
assert.doesNotMatch(draftSource, /[Rr]azorpay/u);

const webhookSource = await readFile("src/webhooks/verify-signature.ts", "utf8");
assert.match(webhookSource, /timingSafeEqual/u);
assert.doesNotMatch(webhookSource, /[Rr]azorpay/u);

async function matchingFiles(directory) {
  const result = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await matchingFiles(item)));
    } else if (entry.isFile() && item.endsWith(".ts")) {
      result.push(item);
    }
  }
  return result.sort();
}

const applicationFiles = [...(await matchingFiles("src")), ...(await matchingFiles("tests"))];
for (const file of applicationFiles) {
  const source = await readFile(file, "utf8");
  assert.doesNotMatch(
    source,
    /new\s+Razorpay\s*\(/u,
    `SDK instantiation in inert fixture: ${file}`,
  );
}

const untrackedPaths = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);
assert.deepEqual(untrackedPaths, []);

process.stdout.write(
  "Seed identity and bounded Razorpay impact match the deterministic manifest.\n",
);
