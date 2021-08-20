import { deferRenderPhaseUpdateToNextBatch, enableProfilerNestedUpdateScheduledHook, enableProfilerTimer } from "../../shared/ReactFeatureFlags";
import { getCurrentUpdatePriority } from "./ReactEventPriorities.old";
import { Hydrating, NoFlags, Placement } from "./ReactFiberFlags";
import { getCurrentEventPriority } from "./ReactFiberHostConfig";
import { claimNextTransitionLane, Lane, Lanes, markRootUpdated, mergeLanes, NoLane, NoLanes, NoTimestamp, SyncLane } from "./ReactFiberLane.old";
import { NoTransition, requestCurrentTransition } from "./ReactFiberTransition";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { ConcurrentMode, NoMode, ProfileMode } from "./ReactTypeOfMode";
import { HostRoot, Profiler } from "./ReactWorkTags";
import { now } from "./Scheduler";


type ExecutionContext = number;

export const NoContext = /*             */ 0b0000;
const BatchedContext = /*               */ 0b0001;
const RenderContext = /*                */ 0b0010;
const CommitContext = /*                */ 0b0100;
export const RetryAfterError = /*       */ 0b1000;


// Describes where we are in the React execution stack
let executionContext: ExecutionContext = NoContext;
// The root we're working on
let workInProgressRoot: FiberRoot | null = null;
// The fiber we're working on
let workInProgress: Fiber | null = null;
// The lanes we're rendering
let workInProgressRootRenderLanes: Lanes = NoLanes;

let currentEventTransitionLane: Lanes = NoLanes;

let currentEventTime: number = NoTimestamp;

// Only used when enableProfilerNestedUpdateScheduledHook is true;
// to track which root is currently committing layout effects.
let rootCommittingMutationOrLayoutEffects: FiberRoot | null = null;

/**
 * 获取当前时间，如果当前并不处于react执行过程中，则用上一次更新的时间
 */
export function requestEventTime(): number {
  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    // 当前处在react的执行过程之中，直接使用当前罪行时间
    return now();
  }
  // 当前不处于react执行过程中，比如setTimeout, 网络请求回调，原生浏览器事件回调之类
  if (currentEventTime !== NoTimestamp) {
    return currentEventTime;
  }
  // 如果不处于React执行过程，并且第一次进来，就对currentEventTime初始化，后续永远不会再过来。
  currentEventTime = now();
  return currentEventTime;
}

/**
 * TODO
 */
export function requestUpdateLane(fiber: Fiber): Lane {
  const mode = fiber.mode;
  /**
   * 如果当前fiber节点不是并发模式，则返回 SyncLane
   * 由此可见，一般我们都用的LegacyMode。所以大部分情况都是SyncLane
   */
  if ((mode & ConcurrentMode) === NoMode) {
    return SyncLane;
  }

  // 下面的都是并发模式下才会判断的

  // 判断是否处于transition
  const isTransition = requestCurrentTransition() !== NoTransition;

  if (isTransition) {
    if (currentEventTransitionLane === NoLane) {
      // 只赋值一次，所有的transition共用一条赛道
      currentEventTransitionLane = claimNextTransitionLane();
    }
    return currentEventTransitionLane;
  }

  /**
   * 这条更新来自于特定的一些react方法，比如flushSync。这个更新优先级和上下文的优先级保持一致。
   */
  const updateLane: Lane = getCurrentUpdatePriority();
  if (updateLane !== NoLane) {
    return updateLane;
  }

  /**
   * 当前运行在react方法之外，根据window.event获取当前正在处理的消息类型，根据消息类型获得不同的优先级
   */
  const eventLane: Lane = getCurrentEventPriority();
  return eventLane;
}

/**
 * 从当前fiber节点向上遍历，更新优先级，最终返回FiberRoot
 */
function markUpdateLaneFromFiberToRoot(
  sourceFiber: Fiber,
  lane: Lane,
): FiberRoot | null {
  // Update the source fiber's lanes
  sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
  let alternate = sourceFiber.alternate;
  if (alternate !== null) {
    alternate.lanes = mergeLanes(alternate.lanes, lane);
  }
  if (__DEV__) {
    if (
      alternate === null &&
      (sourceFiber.flags & (Placement | Hydrating)) !== NoFlags
    ) {
      // warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
    }
  }
  // 这一块代码写的不好，重复代码太多，可以合并的.
  let node = sourceFiber;
  let parent = sourceFiber.return;
  while (parent !== null) {
    parent.childLanes = mergeLanes(parent.childLanes, lane);
    alternate = parent.alternate;
    if (alternate !== null) {
      alternate.childLanes = mergeLanes(alternate.childLanes, lane);
    } else {
      if (__DEV__) {
        if ((parent.flags & (Placement | Hydrating)) !== NoFlags) {
          // warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
        }
      }
    }
    node = parent;
    parent = parent.return;
  }
  if (node.tag === HostRoot) {
    const root: FiberRoot = node.stateNode;
    return root;
  } else {
    return null;
  }
}

/**
 * 判断当前属于渲染过程中的update，通常由于渲染过程中用户输入导致
 */
export function isInterleavedUpdate(fiber: Fiber, lane: Lane) {
  return (
    // TODO: Optimize slightly by comparing to root that fiber belongs to.
    // Requires some refactoring. Not a big deal though since it's rare for
    // concurrent apps to have more than a single root.
    workInProgressRoot !== null &&
    (fiber.mode & ConcurrentMode) !== NoMode &&
    // If this is a render phase update (i.e. UNSAFE_componentWillReceiveProps),
    // then don't treat this as an interleaved update. This pattern is
    // accompanied by a warning but we haven't fully deprecated it yet. We can
    // remove once the deferRenderPhaseUpdateToNextBatch flag is enabled.
    (deferRenderPhaseUpdateToNextBatch ||
      (executionContext & RenderContext) === NoContext)
  );
}


export function scheduleUpdateOnFiber(
  fiber: Fiber,
  lane: Lane,
  eventTime: number,
): FiberRoot | null {
  // checkForNestedUpdates();
  // warnAboutRenderPhaseUpdatesInDEV(fiber);

  const root = markUpdateLaneFromFiberToRoot(fiber, lane);
  if (root === null) {
    // warnAboutUpdateOnUnmountedFiberInDEV(fiber);
    return null;
  }

  if (enableUpdaterTracking) {
    if (isDevToolsPresent) {
      addFiberToLanesMap(root, fiber, lane);
    }
  }

  // Mark that the root has a pending update.
  markRootUpdated(root, lane, eventTime);

  if (enableProfilerTimer && enableProfilerNestedUpdateScheduledHook) {
    if (
      (executionContext & CommitContext) !== NoContext &&
      root === rootCommittingMutationOrLayoutEffects
    ) {
      if (fiber.mode & ProfileMode) {
        let current: Fiber | null = fiber;
        while (current !== null) {
          if (current.tag === Profiler) {
            const {id, onNestedUpdateScheduled} = current.memoizedProps;
            if (typeof onNestedUpdateScheduled === 'function') {
              onNestedUpdateScheduled(id);
            }
          }
          current = current.return;
        }
      }
    }
  }

  // TODO: Consolidate with `isInterleavedUpdate` check
  if (root === workInProgressRoot) {
    // Received an update to a tree that's in the middle of rendering. Mark
    // that there was an interleaved update work on this root. Unless the
    // `deferRenderPhaseUpdateToNextBatch` flag is off and this is a render
    // phase update. In that case, we don't treat render phase updates as if
    // they were interleaved, for backwards compat reasons.
    if (
      deferRenderPhaseUpdateToNextBatch ||
      (executionContext & RenderContext) === NoContext
    ) {
      workInProgressRootUpdatedLanes = mergeLanes(
        workInProgressRootUpdatedLanes,
        lane,
      );
    }
    if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
      // The root already suspended with a delay, which means this render
      // definitely won't finish. Since we have a new update, let's mark it as
      // suspended now, right before marking the incoming update. This has the
      // effect of interrupting the current render and switching to the update.
      // TODO: Make sure this doesn't override pings that happen while we've
      // already started rendering.
      markRootSuspended(root, workInProgressRootRenderLanes);
    }
  }

  ensureRootIsScheduled(root, eventTime);
  if (
    lane === SyncLane &&
    executionContext === NoContext &&
    (fiber.mode & ConcurrentMode) === NoMode &&
    // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
    !(__DEV__ && ReactCurrentActQueue.isBatchingLegacy)
  ) {
    // Flush the synchronous work now, unless we're already working or inside
    // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
    // scheduleCallbackForFiber to preserve the ability to schedule a callback
    // without immediately flushing it. We only do this for user-initiated
    // updates, to preserve historical behavior of legacy mode.
    resetRenderTimer();
    flushSyncCallbacksOnlyInLegacyMode();
  }

  return root;
}