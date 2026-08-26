import assert from "node:assert/strict";
import test from "node:test";

import { draftInvoice } from "../src/invoices/draft-invoice.ts";
import { invoiceInputDouble } from "./support/razorpay.ts";

const generatedAt = new Date("2026-03-17T06:12:00Z");

test("valid reconciliation input drafts an invoice with UTC-normalized labels", () => {
  const draft = draftInvoice(invoiceInputDouble(), generatedAt);

  assert.deepEqual(draft, {
    amountLabel: "INR 1500.00",
    currency: "INR",
    issuedOnLabel: "2024-01-31",
    lineCount: 2,
    number: "LL-DRAFT-20260317-0001",
    totalMinor: 150_000,
  });
});

test("invalid reconciliation input fails closed", () => {
  const base = invoiceInputDouble();

  assert.throws(() => draftInvoice({ ...base, currency: "USD" }, generatedAt), /refuses to draft/u);
  assert.throws(
    () =>
      draftInvoice(
        { ...base, lineItems: [{ ...base.lineItems[0], amountMinor: 1.5 }] },
        generatedAt,
      ),
    /refuses to draft/u,
  );
  assert.throws(
    () => draftInvoice({ ...base, issuedAtIso: "not-a-timestamp" }, generatedAt),
    /refuses to draft/u,
  );
  assert.throws(() => draftInvoice({ ...base, lineItems: [] }, generatedAt), /refuses to draft/u);
  assert.throws(() => draftInvoice(undefined, generatedAt), /refuses to draft/u);
});
