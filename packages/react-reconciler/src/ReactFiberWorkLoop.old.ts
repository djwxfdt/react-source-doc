import { deferRenderPhaseUpdateToNextBatch } from "../../shared/ReactFeatureFlags";
import { getCurrentUpdatePriority } from "./ReactEventPriorities.old";
import { getCurrentEventPriority } from "./ReactFiberHostConfig";
import { claimNextTransitionLane, Lane, Lanes, NoLane, NoLanes, NoTimestamp, SyncLane } from "./ReactFiberLane.old";
import { NoTransition, requestCurrentTransition } from "./ReactFiberTransition";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { ConcurrentMode, NoMode } from "./ReactTypeOfMode";
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