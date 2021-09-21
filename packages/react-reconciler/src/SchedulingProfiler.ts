import { SCHEDULING_PROFILER_VERSION } from "../../react-devtools-scheduling-profiler/src/constants";
import { enableSchedulingProfiler } from "../../shared/ReactFeatureFlags";
import ReactVersion from "../../shared/ReactVersion";
import getComponentNameFromFiber from "./getComponentNameFromFiber";
import { getLabelForLane, Lane, Lanes, TotalLanes } from "./ReactFiberLane.old";
import { Fiber, Wakeable } from "./ReactInternalTypes";


let supportsUserTimingV3 = false;

function markAndClear(name: string) {
  performance.mark(name);
  performance.clearMarks(name);
}


export function markRenderScheduled(lane: Lane): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--schedule-render-${lane}`);
    }
  }
}

export function markPassiveEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--passive-effects-start-${lanes}`);
    }
  }
}

export function markPassiveEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--passive-effects-stop');
    }
  }
}

export function markRenderStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--render-start-${lanes}`);
    }
  }
}
export function markComponentRenderStarted(fiber: Fiber): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      const componentName = getComponentNameFromFiber(fiber) || 'Unknown';
      // TODO (scheduling profiler) Add component stack id
      markAndClear(`--component-render-start-${componentName}`);
    }
  }
}

export function markComponentRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--component-render-stop');
    }
  }
}

export function markRenderStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--render-stop');
    }
  }
}

const laneLabels: Array<string> = [];

export function getLaneLabels(): Array<string> {
  if (laneLabels.length === 0) {
    let lane = 1;
    for (let index = 0; index < TotalLanes; index++) {
      laneLabels.push(((getLabelForLane(lane) as any) as string));

      lane *= 2;
    }
  }
  return laneLabels;
}

function markLaneToLabelMetadata() {
  getLaneLabels();

  markAndClear(`--react-lane-labels-${laneLabels.join(',')}`);
}

function markVersionMetadata() {
  markAndClear(`--react-version-${ReactVersion}`);
  markAndClear(`--profiler-version-${SCHEDULING_PROFILER_VERSION}`);
}


const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
const wakeableIDs: WeakMap<Wakeable, number> = new PossiblyWeakMap();
let wakeableID = 0;

function getWakeableID(wakeable: Wakeable): number {
  if (!wakeableIDs.has(wakeable)) {
    wakeableIDs.set(wakeable, wakeableID++);
  }
  return ((wakeableIDs.get(wakeable) as any) as number);
}

export function markComponentSuspended(
  fiber: Fiber,
  wakeable: Wakeable,
  lanes: Lanes,
): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      const eventType = wakeableIDs.has(wakeable) ? 'resuspend' : 'suspend';
      const id = getWakeableID(wakeable);
      const componentName = getComponentNameFromFiber(fiber) || 'Unknown';
      const phase = fiber.alternate === null ? 'mount' : 'update';
      // TODO (scheduling profiler) Add component stack id
      markAndClear(
        `--suspense-${eventType}-${id}-${componentName}-${phase}-${lanes}`,
      );
      wakeable.then(
        () => markAndClear(`--suspense-resolved-${id}-${componentName}`),
        () => markAndClear(`--suspense-rejected-${id}-${componentName}`),
      );
    }
  }
}


export function markCommitStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--commit-start-${lanes}`);

      // Certain types of metadata should be logged infrequently.
      // Normally we would log this during module init,
      // but there's no guarantee a user is profiling at that time.
      // Commits happen infrequently (less than renders or state updates)
      // so we log this extra information along with a commit.
      // It will likely be logged more than once but that's okay.
      //
      // TODO Once DevTools supports starting/stopping the profiler,
      // we can log this data only once (when started) and remove the per-commit logging.
      markVersionMetadata();
      markLaneToLabelMetadata();
    }
  }
}

export function markCommitStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--commit-stop');
    }
  }
}

export function markLayoutEffectsStarted(lanes: Lanes): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear(`--layout-effects-start-${lanes}`);
    }
  }
}


export function markLayoutEffectsStopped(): void {
  if (enableSchedulingProfiler) {
    if (supportsUserTimingV3) {
      markAndClear('--layout-effects-stop');
    }
  }
}
