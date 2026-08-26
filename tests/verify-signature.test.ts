import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyWebhookSignature } from "../src/webhooks/verify-signature.ts";
import { webhookMaterialDouble } from "./support/razorpay.ts";

const fakeSignatureMarker = "expected-digest-double";

function hmacHex(message: Buffer, secret: Buffer): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

test("matching digests verify through timing-safe comparison", () => {
  const { bodyText, secretText } = webhookMaterialDouble();
  const bodyBytes = Buffer.from(bodyText, "utf8");
  const secretBytes = Buffer.from(secretText, "utf8");

  const callerSignature = createHmac("sha256", secretBytes).update(bodyBytes).digest();

  assert.equal(verifyWebhookSignature(bodyBytes, callerSignature, secretBytes), true);
  assert.match(hmacHex(bodyBytes, secretBytes), /^[0-9a-f]{64}$/u);
});

test("mismatched bodies or signatures fail verification", () => {
  const { bodyText, secretText } = webhookMaterialDouble();
  const bodyBytes = Buffer.from(bodyText, "utf8");
  const secretBytes = Buffer.from(secretText, "utf8");

  const honestSignature = createHmac("sha256", secretBytes).update(bodyBytes).digest();
  const tamperedBody = Buffer.concat([bodyBytes, Buffer.from(" ", "utf8")]);
  const tamperedSignature = createHmac("sha256", secretBytes).update(tamperedBody).digest();
  const wrongSecretSignature = createHmac("sha256", Buffer.from("other-double-secret", "utf8"))
    .update(bodyBytes)
    .digest();

  assert.equal(verifyWebhookSignature(tamperedBody, tamperedSignature, secretBytes), true);
  assert.equal(verifyWebhookSignature(bodyBytes, tamperedSignature, secretBytes), false);
  assert.equal(verifyWebhookSignature(tamperedBody, honestSignature, secretBytes), false);
  assert.equal(verifyWebhookSignature(bodyBytes, wrongSecretSignature, secretBytes), false);
});

test("foreign-length signatures fail instead of throwing", () => {
  const { bodyText, secretText } = webhookMaterialDouble();
  const bodyBytes = Buffer.from(bodyText, "utf8");
  const secretBytes = Buffer.from(secretText, "utf8");

  const fakeSignatureBytes = Buffer.from(fakeSignatureMarker, "utf8");
  assert.equal(verifyWebhookSignature(bodyBytes, fakeSignatureBytes, secretBytes), false);
});
