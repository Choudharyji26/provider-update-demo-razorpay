import assert from "node:assert/strict";
import test from "node:test";

import { settlePayment } from "../src/payments/settle-payment.ts";
import { captureDouble } from "./support/razorpay.ts";

test("captured payments map to settled without claiming completion", () => {
  const capture = captureDouble("captured", true);

  assert.deepEqual(settlePayment(capture), {
    amountState: "settled",
    completionClaimed: false,
    currency: "INR",
    paymentId: "pay-double-00000000000001",
    provider: "razorpay",
  });
});

test("authorized but uncaptured payments stay awaiting capture", () => {
  const capture = captureDouble("authorized", false);

  assert.equal(settlePayment(capture).amountState, "awaiting-capture");
});

test("failed captures are rejected", () => {
  const capture = captureDouble("failed", false);

  assert.equal(settlePayment(capture).amountState, "rejected");
});
