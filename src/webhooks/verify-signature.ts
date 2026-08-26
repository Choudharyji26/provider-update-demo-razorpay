import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookSignature(
  bodyBytes: Uint8Array,
  signatureBytes: Uint8Array,
  secretBytes: Uint8Array,
): boolean {
  const expectedDigest = createHmac("sha256", secretBytes).update(bodyBytes).digest();

  return (
    expectedDigest.length === signatureBytes.length &&
    timingSafeEqual(expectedDigest, signatureBytes)
  );
}
