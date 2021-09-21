import { enableProfilerTimer, enableProfilerCommitHooks, enableProfilerNestedUpdatePhase } from "../../shared/ReactFeatureFlags";
import { Fiber } from "./ReactInternalTypes";
import { HostRoot, Profiler } from "./ReactWorkTags";
import { now } from "./Scheduler";

let commitTime = 0;
let layoutEffectStartTime = -1;
let profilerStartTime = -1;
let passiveEffectStartTime = -1;


let currentUpdateIsNested = false;
let nestedUpdateScheduled = false;

export function syncNestedUpdateFlag(): void {
  if (enableProfilerNestedUpdatePhase) {
    currentUpdateIsNested = nestedUpdateScheduled;
    nestedUpdateScheduled = false;
  }
}

export function startPassiveEffectTimer(): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  passiveEffectStartTime = now();
}

export function recordPassiveEffectDuration(fiber: Fiber): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }

  if (passiveEffectStartTime >= 0) {
    const elapsedTime = now() - passiveEffectStartTime;

    passiveEffectStartTime = -1;

    // Store duration on the next nearest Profiler ancestor
    // Or the root (for the DevTools Profiler to read)
    let parentFiber = fiber.return;
    while (parentFiber !== null) {
      switch (parentFiber.tag) {
        case HostRoot:
          const root = parentFiber.stateNode;
          if (root !== null) {
            root.passiveEffectDuration += elapsedTime;
          }
          return;
        case Profiler:
          const parentStateNode = parentFiber.stateNode;
          if (parentStateNode !== null) {
            // Detached fibers have their state node cleared out.
            // In this case, the return pointer is also cleared out,
            // so we won't be able to report the time spent in this Profiler's subtree.
            parentStateNode.passiveEffectDuration += elapsedTime;
          }
          return;
      }
      parentFiber = parentFiber.return;
    }
  }
}

export function getCommitTime(): number {
  return commitTime;
}

export function isCurrentUpdateNested(): boolean {
  return currentUpdateIsNested;
}

export function startLayoutEffectTimer(): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  layoutEffectStartTime = now();
}


export function recordLayoutEffectDuration(fiber: Fiber): void {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }

  if (layoutEffectStartTime >= 0) {
    const elapsedTime = now() - layoutEffectStartTime;

    layoutEffectStartTime = -1;

    // Store duration on the next nearest Profiler ancestor
    // Or the root (for the DevTools Profiler to read)
    let parentFiber = fiber.return;
    while (parentFiber !== null) {
      switch (parentFiber.tag) {
        case HostRoot:
          const root = parentFiber.stateNode;
          root.effectDuration += elapsedTime;
          return;
        case Profiler:
          const parentStateNode = parentFiber.stateNode;
          parentStateNode.effectDuration += elapsedTime;
          return;
      }
      parentFiber = parentFiber.return;
    }
  }
}


export function startProfilerTimer(fiber: Fiber): void {
  if (!enableProfilerTimer) {
    return;
  }

  profilerStartTime = now();

  if (fiber.actualStartTime! < 0) {
    fiber.actualStartTime = now();
  }
}


export function stopProfilerTimerIfRunningAndRecordDelta(
  fiber: Fiber,
  overrideBaseTime: boolean,
): void {
  if (!enableProfilerTimer) {
    return;
  }

  if (profilerStartTime >= 0) {
    const elapsedTime = now() - profilerStartTime;
    fiber.actualDuration! += elapsedTime;
    if (overrideBaseTime) {
      fiber.selfBaseDuration = elapsedTime;
    }
    profilerStartTime = -1;
  }
}

export function markNestedUpdateScheduled(): void {
  if (enableProfilerNestedUpdatePhase) {
    nestedUpdateScheduled = true;
  }
}

export function recordCommitTime(): void {
  if (!enableProfilerTimer) {
    return;
  }
  commitTime = now();
}