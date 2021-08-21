import { deferRenderPhaseUpdateToNextBatch, enableProfilerNestedUpdateScheduledHook, enableProfilerTimer, enableUpdaterTracking } from "../../shared/ReactFeatureFlags";
import { ContinuousEventPriority, DefaultEventPriority, DiscreteEventPriority, getCurrentUpdatePriority, IdleEventPriority, lanesToEventPriority } from "./ReactEventPriorities.old";
import { isDevToolsPresent } from "./ReactFiberDevToolsHook.old";
import { Hydrating, NoFlags, Placement } from "./ReactFiberFlags";
import { getCurrentEventPriority, scheduleMicrotask, supportsMicrotasks } from "./ReactFiberHostConfig";
import {
  addFiberToLanesMap,
  claimNextTransitionLane, Lane, Lanes, markRootUpdated, mergeLanes,
  NoLane, NoLanes, NoTimestamp, removeLanes, SyncLane,
  markRootSuspended as markRootSuspended_dontCallThisOneDirectly,
  markStarvedLanesAsExpired,
  getNextLanes,
  getHighestPriorityLane,
} from "./ReactFiberLane.old";
import { NoTransition, requestCurrentTransition } from "./ReactFiberTransition";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { ConcurrentMode, NoMode, ProfileMode } from "./ReactTypeOfMode";
import { HostRoot, Profiler } from "./ReactWorkTags";
import {
  now,
  scheduleCallback as Scheduler_scheduleCallback,
  cancelCallback as Scheduler_cancelCallback,
  shouldYield,
  // requestPaint,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
} from "./Scheduler";
import ReactSharedInternals from '../../shared/ReactSharedInternals'
import { flushSyncCallbacks, flushSyncCallbacksOnlyInLegacyMode, scheduleLegacySyncCallback, scheduleSyncCallback } from './ReactFiberSyncTaskQueue.old'
import { LegacyRoot } from "./ReactRootTags";
import { PriorityLevel } from "../../scheduler/src/SchedulerPriorities";

const {
  ReactCurrentActQueue,
} = ReactSharedInternals;

type ExecutionContext = number;

export const NoContext = /*             */ 0b0000;
const BatchedContext = /*               */ 0b0001;
const RenderContext = /*                */ 0b0010;
const CommitContext = /*                */ 0b0100;
export const RetryAfterError = /*       */ 0b1000;


type RootExitStatus = 0 | 1 | 2 | 3 | 4 | 5;
const RootIncomplete = 0;
const RootFatalErrored = 1;
const RootErrored = 2;
const RootSuspended = 3;
const RootSuspendedWithDelay = 4;
const RootCompleted = 5;

/**
 * 执行完更新之后，当前fiberRoot节点的退出状态
 */
let workInProgressRootExitStatus: RootExitStatus = RootIncomplete;


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


// 在更新期间触发的更新，保存他们的优先级
let workInProgressRootUpdatedLanes: Lanes = NoLanes;

// Lanes that were pinged (in an interleaved event) during this render.
let workInProgressRootPingedLanes: Lanes = NoLanes;

const fakeActCallbackNode = {};
function scheduleCallback(priorityLevel: PriorityLevel, callback: Function) {
  if (__DEV__) {
    // If we're currently inside an `act` scope, bypass Scheduler and push to
    // the `act` queue instead.
    const actQueue = ReactCurrentActQueue.current;
    if (actQueue !== null) {
      actQueue.push(callback);
      return fakeActCallbackNode;
    } else {
      return Scheduler_scheduleCallback(priorityLevel, callback);
    }
  } else {
    // In production, always call Scheduler. This function will be stripped out.
    return Scheduler_scheduleCallback(priorityLevel, callback);
  }
}

function cancelCallback(callbackNode: any) {
  if (__DEV__ && callbackNode === fakeActCallbackNode) {
    return;
  }
  // In production, always call Scheduler. This function will be stripped out.
  return Scheduler_cancelCallback(callbackNode);
}

function markRootSuspended(root: FiberRoot, suspendedLanes: Lanes) {
  // When suspending, we should always exclude lanes that were pinged or (more
  // rarely, since we try to avoid it) updated during the render phase.
  // TODO: Lol maybe there's a better way to factor this besides this
  // obnoxiously named function :)
  suspendedLanes = removeLanes(suspendedLanes, workInProgressRootPingedLanes);
  suspendedLanes = removeLanes(suspendedLanes, workInProgressRootUpdatedLanes);
  markRootSuspended_dontCallThisOneDirectly(root, suspendedLanes);
}


// The absolute time for when we should start giving up on rendering
// more and prefer CPU suspense heuristics instead.
let workInProgressRootRenderTargetTime: number = Infinity;
// How long a render is supposed to take before we start following CPU
// suspense heuristics and opt out of rendering more content.
const RENDER_TIMEOUT_MS = 500;

function resetRenderTimer() {
  workInProgressRootRenderTargetTime = now() + RENDER_TIMEOUT_MS;
}

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

  /**
   * 和isInterleavedUpdate差不多
   */
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

/**
 * 这个方法实际上每次更新都会进来，从fiberRoot开始执行任务调度
 * 会和调度模块进行交互
 */
function ensureRootIsScheduled(root: FiberRoot, currentTime: number) {
  const existingCallbackNode = root.callbackNode;

  markStarvedLanesAsExpired(root, currentTime);

  const nextLanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
  );

  if (nextLanes === NoLanes) {
    // Special case: There's nothing to work on.
    if (existingCallbackNode !== null) {
      cancelCallback(existingCallbackNode);
    }
    root.callbackNode = null;
    root.callbackPriority = NoLane;
    return;
  }

  const newCallbackPriority = getHighestPriorityLane(nextLanes);

  const existingCallbackPriority = root.callbackPriority;

  if (
    existingCallbackPriority === newCallbackPriority &&
    // Special case related to `act`. If the currently scheduled task is a
    // Scheduler task, rather than an `act` task, cancel it and re-scheduled
    // on the `act` queue.
    !(
      __DEV__ &&
      ReactCurrentActQueue.current !== null &&
      existingCallbackNode !== fakeActCallbackNode
    )
  ) {
    if (__DEV__) {
      // If we're going to re-use an existing task, it needs to exist.
      // Assume that discrete update microtasks are non-cancellable and null.
      // TODO: Temporary until we confirm this warning is not fired.
      if (
        existingCallbackNode == null &&
        existingCallbackPriority !== SyncLane
      ) {
        console.error(
          'Expected scheduled callback to exist. This error is likely caused by a bug in React. Please file an issue.',
        );
      }
    }
    // The priority hasn't changed. We can reuse the existing task. Exit.
    return;
  }

  if (existingCallbackNode != null) {
    // Cancel the existing callback. We'll schedule a new one below.
    cancelCallback(existingCallbackNode);
  }


  let newCallbackNode;
  if (newCallbackPriority === SyncLane) {
    // Special case: Sync React callbacks are scheduled on a special
    // internal queue
    if (root.tag === LegacyRoot) {
      if (__DEV__ && ReactCurrentActQueue.isBatchingLegacy !== null) {
        ReactCurrentActQueue.didScheduleLegacyUpdate = true;
      }
      scheduleLegacySyncCallback(performSyncWorkOnRoot.bind(null, root));
    } else {
      scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    }
    if (supportsMicrotasks) {
      // Flush the queue in a microtask.
      if (__DEV__ && ReactCurrentActQueue.current !== null) {
        // Inside `act`, use our internal `act` queue so that these get flushed
        // at the end of the current scope even when using the sync version
        // of `act`.
        ReactCurrentActQueue.current.push(flushSyncCallbacks);
      } else {
        scheduleMicrotask(flushSyncCallbacks);
      }
    } else {
      // Flush the queue in an Immediate task.
      scheduleCallback(ImmediateSchedulerPriority, flushSyncCallbacks);
    }
    newCallbackNode = null;
  } else {
    let schedulerPriorityLevel: PriorityLevel;
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        schedulerPriorityLevel = ImmediateSchedulerPriority;
        break;
      case ContinuousEventPriority:
        schedulerPriorityLevel = UserBlockingSchedulerPriority;
        break;
      case DefaultEventPriority:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
      case IdleEventPriority:
        schedulerPriorityLevel = IdleSchedulerPriority;
        break;
      default:
        schedulerPriorityLevel = NormalSchedulerPriority;
        break;
    }
    newCallbackNode = scheduleCallback(
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
    );
  }

  root.callbackPriority = newCallbackPriority;
  root.callbackNode = newCallbackNode;
}


function performSyncWorkOnRoot(root: FiberRoot) {
  return null;
}


// This is the entry point for every concurrent task, i.e. anything that
// goes through Scheduler.
function performConcurrentWorkOnRoot(root: FiberRoot, didTimeout?: boolean) {
  return null;
}