export interface RazorpayRefundShape {
  readonly amountMinor: number;
  readonly id: string;
  readonly paymentId: string;
  readonly status: string;
}

export type RefundLifecycle =
  | { readonly phase: "accepted"; readonly terminal: false }
  | { readonly phase: "complete"; readonly terminal: true }
  | { readonly phase: "in-flight"; readonly terminal: false }
  | { readonly phase: "rejected"; readonly terminal: true };

const lifecycleByStatus = new Map<string, RefundLifecycle>([
  ["created", { phase: "accepted", terminal: false }],
  ["failed", { phase: "rejected", terminal: true }],
  ["pending", { phase: "in-flight", terminal: false }],
  ["processed", { phase: "complete", terminal: true }],
]);

export function classifyRefund(refund: RazorpayRefundShape): RefundLifecycle {
  const lifecycle = lifecycleByStatus.get(refund.status);
  if (!lifecycle) {
    throw new Error(`Ledger Line cannot classify refund status "${refund.status}".`);
  }

  return lifecycle;
}
