import { Fiber } from "./ReactInternalTypes";

export const ReactStrictModeWarnings = {
  recordUnsafeLifecycleWarnings(fiber: Fiber, instance: any): void {},
  flushPendingUnsafeLifecycleWarnings(): void {},
  recordLegacyContextWarning(fiber: Fiber, instance: any): void {},
  flushLegacyContextWarning(): void {},
  discardPendingWarnings(): void {},
};