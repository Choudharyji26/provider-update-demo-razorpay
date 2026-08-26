import assert from "node:assert/strict";
import test from "node:test";

import { classifyRefund } from "../src/refunds/refund-status.ts";
import { refundDouble } from "./support/razorpay.ts";

test("processed refunds reach the terminal complete phase", () => {
  const refund = refundDouble("processed");

  assert.deepEqual(classifyRefund(refund), { phase: "complete", terminal: true });
});

test("created and pending refunds remain non-terminal", () => {
  assert.equal(classifyRefund(refundDouble("created")).terminal, false);
  assert.equal(classifyRefund(refundDouble("created")).phase, "accepted");
  assert.equal(classifyRefund(refundDouble("pending")).phase, "in-flight");
});

test("failed refunds are terminal rejections", () => {
  const refund = refundDouble("failed");

  assert.deepEqual(classifyRefund(refund), { phase: "rejected", terminal: true });
});

test("unknown refund statuses fail closed", () => {
  const refund = refundDouble("mysteriously-floating");

  assert.throws(() => classifyRefund(refund), /cannot classify refund status/u);
});
