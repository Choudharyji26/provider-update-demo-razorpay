import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { z } from "zod";

dayjs.extend(utc);

export const lineItemSchema = z.object({
  amountMinor: z.number().int().positive(),
  label: z.string().min(1),
});

export const draftInvoiceInputSchema = z.object({
  currency: z.literal("INR"),
  issuedAtIso: z.string().refine((value) => dayjs(value).isValid(), {
    message: "issuedAtIso must be a timestamp dayjs can parse",
  }),
  lineItems: z.array(lineItemSchema).min(1),
});

export type DraftInvoiceInput = z.infer<typeof draftInvoiceInputSchema>;

export interface InvoiceDraft {
  amountLabel: string;
  currency: "INR";
  issuedOnLabel: string;
  lineCount: number;
  number: string;
  totalMinor: number;
}

export function draftInvoice(input: unknown, generatedAt: Date): InvoiceDraft {
  const parsed = draftInvoiceInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Ledger Line refuses to draft an invoice from invalid reconciliation input.");
  }

  const totalMinor = parsed.data.lineItems.reduce(
    (runningTotal, item) => runningTotal + item.amountMinor,
    0,
  );

  return {
    amountLabel: `INR ${(totalMinor / 100).toFixed(2)}`,
    currency: "INR",
    issuedOnLabel: dayjs(parsed.data.issuedAtIso).utcOffset(0).format("YYYY-MM-DD"),
    lineCount: parsed.data.lineItems.length,
    number: `LL-DRAFT-${dayjs(generatedAt).utcOffset(0).format("YYYYMMDD")}-0001`,
    totalMinor,
  };
}
