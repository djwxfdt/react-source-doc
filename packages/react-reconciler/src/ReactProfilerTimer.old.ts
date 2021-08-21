import { enableProfilerTimer, enableProfilerCommitHooks } from "../../shared/ReactFeatureFlags";
import { now } from "./Scheduler";

let passiveEffectStartTime: number = -1;

export function startPassiveEffectTimer(): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  passiveEffectStartTime = now();
}