import { enableCache, enableProfilerCommitHooks, enableProfilerTimer, enableSuspenseCallback, enableUpdaterTracking } from "../../shared/ReactFeatureFlags";
import { MutableSource, MutableSourceVersion } from "../../shared/ReactTypes";
import { Container, noTimeout, supportsHydration, TimeoutHandle } from "./ReactFiberHostConfig";
import { createLaneMap, Lane, LaneMap, Lanes, NoLane, NoLanes, NoTimestamp, TotalLanes } from "./ReactFiberLane.old";
import { Fiber, FiberRoot, SuspenseHydrationCallbacks, Wakeable } from "./ReactInternalTypes";
import { ConcurrentRoot, LegacyRoot, RootTag } from "./ReactRootTags";
import { Cache } from './ReactFiberCacheComponent.old';
import { createHostRootFiber } from "./ReactFiber.old";
import { initializeUpdateQueue } from "./ReactUpdateQueue.old";

class FiberRootNode implements FiberRoot {
  /**
   * LegacyRootæˆ–ConcurrentRoot
   */
  tag: RootTag;

  /**
    * HTMLElement
  */
  containerInfo: any;
  pendingChildren: any;
  current: Fiber | null;
  pingCache: WeakMap<Wakeable, Set<any>> | Map<Wakeable, Set<any>> | null;
  finishedWork: Fiber | null;
  timeoutHandle: any;
  context: Object | null;
  pendingContext: Object | null;
  hydrate: boolean;
  mutableSourceEagerHydrationData?: any[] | null | undefined;
  callbackNode: any;
  callbackPriority: number;
  eventTimes: LaneMap<number>;
  expirationTimes: LaneMap<number>;
  pendingLanes: Lanes;
  suspendedLanes: Lanes;
  pingedLanes: Lanes;
  expiredLanes: Lanes;
  mutableReadLanes: Lanes;
  finishedLanes: Lanes;
  entangledLanes: Lanes;
  entanglements: LaneMap<Lanes>;
  pooledCache?: Cache | null;
  pooledCacheLanes?: Lanes;
  hydrationCallbacks?: SuspenseHydrationCallbacks | null;
  memoizedUpdaters?: Set<Fiber>;
  pendingUpdatersLaneMap?: LaneMap<Set<Fiber>>;

 
  effectDuration?: number
  passiveEffectDuration?: number
  _debugRootType?: string

  constructor(containerInfo: Container, tag: RootTag, hydrate: boolean) {
    this.tag = tag;
    this.containerInfo = containerInfo;
    this.pendingChildren = null;
    this.current = null;
    this.pingCache = null;
    this.finishedWork = null;
    this.timeoutHandle = noTimeout;
    this.context = null;
    this.pendingContext = null;
    this.hydrate = hydrate;
    this.callbackNode = null;
    this.callbackPriority = NoLane;
    this.eventTimes = createLaneMap(NoLanes);
    this.expirationTimes = createLaneMap(NoTimestamp);
  
    this.pendingLanes = NoLanes;
    this.suspendedLanes = NoLanes;
    this.pingedLanes = NoLanes;
    this.expiredLanes = NoLanes;
    this.mutableReadLanes = NoLanes;
    this.finishedLanes = NoLanes;
  
    this.entangledLanes = NoLanes;
    this.entanglements = createLaneMap(NoLanes);
  
    if (enableCache) {
      this.pooledCache = null;
      this.pooledCacheLanes = NoLanes;
    }
  
    if (supportsHydration) {
      this.mutableSourceEagerHydrationData = null;
    }
  
    if (enableSuspenseCallback) {
      this.hydrationCallbacks = null;
    }
  
    if (enableProfilerTimer && enableProfilerCommitHooks) {
      this.effectDuration = 0;
      this.passiveEffectDuration = 0;
    }
  
    if (enableUpdaterTracking) {
      this.memoizedUpdaters = new Set();
      this.pendingUpdatersLaneMap = [];
      const pendingUpdatersLaneMap = this.pendingUpdatersLaneMap;
      for (let i = 0; i < TotalLanes; i++) {
        pendingUpdatersLaneMap.push(new Set());
      }
    }
  
    if (__DEV__) {
      switch (tag) {
        case ConcurrentRoot:
          this._debugRootType = 'createRoot()';
          break;
        case LegacyRoot:
          this._debugRootType = 'createLegacyRoot()';
          break;
      }
    }
  }
  
}

/**
 * åˆ›å»º FiberRoot å¯¹è±¡
 * @param containerInfo webä¸­æ˜¯ç½‘é¡µdomå¯¹è±¡ HTMLElement
 * @param tag è¡¨æ˜ŽfiberRootçš„ç±»åž‹ï¼Œåˆ†ä¸ºlegacy_rootå’Œconcurrent_rootã€‚
 * @param hydrate æ˜¯å?¦æ³¨æ°´ï¼Œæœ?åŠ¡ç«¯æ¸²æŸ“çš„æ–¹å¼?ä¼šç”¨åˆ°è¿™ä¸ª
 * @param hydrationCallbacks 
 * @param isStrictMode  æ˜¯å?¦æ˜¯ StrictMode ç”¨äºŽæ£€æŸ¥ä¸?å®‰å…¨çš„reactä»£ç ?
 * @param concurrentUpdatesByDefaultOverride 
 * @returns FiberRoot
 */
export function createFiberRoot(
  containerInfo: Container,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
): FiberRoot {
  const root: FiberRoot = new FiberRootNode(containerInfo, tag, hydrate);
  if (enableSuspenseCallback) {
    root.hydrationCallbacks = hydrationCallbacks;
  }

  // åˆ›å»ºä¸€ä¸ªåˆ?å§‹åŒ–çš„HostRootç±»åž‹çš„fiberèŠ‚ç‚¹ï¼ˆcreate HostRoot Fiberï¼‰
  const uninitializedFiber = createHostRootFiber(
    tag,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
  );
  /**
   * æŠŠHostRootFiberæŒ‚åˆ°FiberRootä¸Š
   */
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;

  if (enableCache) {
    const initialCache = new Map();
    root.pooledCache = initialCache;
    const initialState = {
      element: null,
      cache: initialCache,
    };
    uninitializedFiber.memoizedState = initialState;
  } else {
    const initialState = {
      element: null,
    };
    uninitializedFiber.memoizedState = initialState;
  }

  initializeUpdateQueue(uninitializedFiber);

  return root;
}

