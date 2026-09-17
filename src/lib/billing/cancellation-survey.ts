import type { CancellationReason } from "@prisma/client";

/** Valid cancellation survey reasons (must match the Prisma enum). */
export const cancellationReasons = [
  "TOO_EXPENSIVE",
  "MISSING_FEATURES",
  "SWITCHING_TOOL",
  "NOT_USING_ENOUGH",
  "OTHER",
] as const satisfies readonly CancellationReason[];

/** Human-friendly labels for the survey UI. */
export const cancellationReasonLabel: Record<
  (typeof cancellationReasons)[number],
  string
> = {
  TOO_EXPENSIVE: "It's too expensive",
  MISSING_FEATURES: "Missing features I need",
  SWITCHING_TOOL: "Switching to another tool",
  NOT_USING_ENOUGH: "I'm not using it enough",
  OTHER: "Something else",
};