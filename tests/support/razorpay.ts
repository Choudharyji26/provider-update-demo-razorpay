import type { RazorpayCaptureShape } from "../../src/payments/settle-payment.ts";
import type { RazorpayRefundShape } from "../../src/refunds/refund-status.ts";
import type { DraftInvoiceInput } from "../../src/invoices/draft-invoice.ts";

export function captureDouble(status: string, captured: boolean): RazorpayCaptureShape {
  return {
    captured,
    currency: "INR",
    id: "pay-double-00000000000001",
    status,
  };
}

export function refundDouble(status: string): RazorpayRefundShape {
  return {
    amountMinor: 4500,
    id: "rfnd-double-0000000000001",
    paymentId: "pay-double-00000000000002",
    status,
  };
}

export function webhookMaterialDouble(): { bodyText: string; secretText: string } {
  return {
    bodyText: "ledger-line-webhook-body-double",
    secretText: "ledger-line-shared-secret-double",
  };
}

export function invoiceInputDouble(): DraftInvoiceInput {
  return {
    currency: "INR",
    issuedAtIso: "2024-02-01T02:30:00+13:00",
    lineItems: [
      { amountMinor: 125_000, label: "reconciliation-window-coaching" },
      { amountMinor: 25_000, label: "dispute-case-summary" },
    ],
  };
}
