export interface RazorpayCaptureShape {
  readonly captured: boolean;
  readonly currency: string;
  readonly id: string;
  readonly status: string;
}

export type SettlementAmountState = "awaiting-capture" | "rejected" | "settled";

export interface SettlementView {
  readonly amountState: SettlementAmountState;
  readonly completionClaimed: false;
  readonly currency: string;
  readonly paymentId: string;
  readonly provider: "razorpay";
}

export function settlePayment(capture: RazorpayCaptureShape): SettlementView {
  if (capture.status === "failed") {
    return {
      amountState: "rejected",
      completionClaimed: false,
      currency: capture.currency,
      paymentId: capture.id,
      provider: "razorpay",
    };
  }

  return {
    amountState: capture.captured ? "settled" : "awaiting-capture",
    completionClaimed: false,
    currency: capture.currency,
    paymentId: capture.id,
    provider: "razorpay",
  };
}
