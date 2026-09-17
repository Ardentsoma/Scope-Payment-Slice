import { z } from "zod";
import { isProPlan, type PlanId } from "@/lib/billing/plans";

export const subscribeSchema = z.object({
  planId: z
    .enum(["free", "pro_yearly", "pro_monthly"])
    .refine((id) => isProPlan(id), {
      message: "Only paid plans can be subscribed through checkout.",
    }),
  cardholderName: z.string().trim().min(3, "Cardholder name is required").nullish(),
  billingEmail: z
    .string()
    .trim()
    .email("Valid billing email required")
    .nullish(),
  companyName: z.string().trim().nullish(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type { PlanId };