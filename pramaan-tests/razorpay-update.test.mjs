import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { draftInvoice } from "../src/invoices/draft-invoice.ts";
import { settlePayment } from "../src/payments/settle-payment.ts";
import { classifyRefund } from "../src/refunds/refund-status.ts";
import { verifyWebhookSignature } from "../src/webhooks/verify-signature.ts";

const generatedAt = new Date("2026-03-17T06:12:00Z");

test("settlePayment maps Razorpay-shaped captures to settlement views", () => {
  assert.deepEqual(
    settlePayment({ captured: true, currency: "INR", id: "pay_1", status: "captured" }),
    {
      amountState: "settled",
      completionClaimed: false,
      currency: "INR",
      paymentId: "pay_1",
      provider: "razorpay",
    },
  );

  assert.deepEqual(
    settlePayment({ captured: false, currency: "INR", id: "pay_2", status: "authorized" }),
    {
      amountState: "awaiting-capture",
      completionClaimed: false,
      currency: "INR",
      paymentId: "pay_2",
      provider: "razorpay",
    },
  );

  assert.deepEqual(
    settlePayment({ captured: false, currency: "INR", id: "pay_3", status: "failed" }),
    {
      amountState: "rejected",
      completionClaimed: false,
      currency: "INR",
      paymentId: "pay_3",
      provider: "razorpay",
    },
  );
});

test("classifyRefund maps Razorpay-shaped refunds to lifecycle phases", () => {
  assert.deepEqual(
    classifyRefund({ amountMinor: 100, id: "rfnd_1", paymentId: "pay_1", status: "processed" }),
    { phase: "complete", terminal: true },
  );
  assert.deepEqual(
    classifyRefund({ amountMinor: 100, id: "rfnd_2", paymentId: "pay_1", status: "created" }),
    { phase: "accepted", terminal: false },
  );
  assert.deepEqual(
    classifyRefund({ amountMinor: 100, id: "rfnd_3", paymentId: "pay_1", status: "pending" }),
    { phase: "in-flight", terminal: false },
  );
  assert.deepEqual(
    classifyRefund({ amountMinor: 100, id: "rfnd_4", paymentId: "pay_1", status: "failed" }),
    { phase: "rejected", terminal: true },
  );
  assert.throws(
    () =>
      classifyRefund({ amountMinor: 100, id: "rfnd_5", paymentId: "pay_1", status: "unknown" }),
    /cannot classify refund status/u,
  );
});

test("draftInvoice drafts an INR invoice from validated input", () => {
  const input = {
    currency: "INR",
    issuedAtIso: "2024-02-01T02:30:00+13:00",
    lineItems: [
      { amountMinor: 125_000, label: "coaching" },
      { amountMinor: 25_000, label: "summary" },
    ],
  };

  assert.deepEqual(draftInvoice(input, generatedAt), {
    amountLabel: "INR 1500.00",
    currency: "INR",
    issuedOnLabel: "2024-01-31",
    lineCount: 2,
    number: "LL-DRAFT-20260317-0001",
    totalMinor: 150_000,
  });

  assert.throws(() => draftInvoice({ ...input, currency: "USD" }, generatedAt), /refuses to draft/u);
});

test("verifyWebhookSignature validates HMAC digests safely", () => {
  const body = Buffer.from("ledger-line-webhook-body-double", "utf8");
  const secret = Buffer.from("ledger-line-shared-secret-double", "utf8");
  const goodSignature = createHmac("sha256", secret).update(body).digest();

  assert.equal(verifyWebhookSignature(body, goodSignature, secret), true);

  const tamperedBody = Buffer.concat([body, Buffer.from(" ", "utf8")]);
  const tamperedSignature = createHmac("sha256", secret).update(tamperedBody).digest();
  assert.equal(verifyWebhookSignature(body, tamperedSignature, secret), false);
  assert.equal(verifyWebhookSignature(tamperedBody, goodSignature, secret), false);

  const wrongSecret = Buffer.from("other-secret", "utf8");
  const wrongSignature = createHmac("sha256", wrongSecret).update(body).digest();
  assert.equal(verifyWebhookSignature(body, wrongSignature, secret), false);

  assert.equal(verifyWebhookSignature(body, Buffer.from("short", "utf8"), secret), false);
});

test("repository pins razorpay to 2.9.8 and never instantiates the SDK", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(packageJson.dependencies.razorpay, "2.9.8");

  const installed = JSON.parse(await readFile("node_modules/razorpay/package.json", "utf8"));
  assert.equal(installed.version, "2.9.8");

  async function* tsFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const item = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        yield* tsFiles(item);
      } else if (entry.isFile() && item.endsWith(".ts")) {
        yield item;
      }
    }
  }

  const instantiation = /new\s+Razorpay\s*\(/u;
  const sdkImport = /(?:from\s+["']razorpay["']|require\s*\(\s*["']razorpay["']\s*\))/u;

  for await (const file of tsFiles("src")) {
    const source = await readFile(file, "utf8");
    assert.equal(instantiation.test(source), false, `SDK instantiation in ${file}`);
    assert.equal(sdkImport.test(source), false, `SDK import in ${file}`);
  }

  for await (const file of tsFiles("tests")) {
    const source = await readFile(file, "utf8");
    assert.equal(instantiation.test(source), false, `SDK instantiation in ${file}`);
    assert.equal(sdkImport.test(source), false, `SDK import in ${file}`);
  }
});
