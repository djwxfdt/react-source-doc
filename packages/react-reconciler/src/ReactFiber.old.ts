import { allowConcurrentByDefault, createRootStrictEffectsByDefault, enableProfilerTimer, enableStrictEffects, enableSyncDefaultUpdates } from "../../shared/ReactFeatureFlags";
import { isDevToolsPresent } from "./ReactFiberDevToolsHook.old";
import { Flags, NoFlags, StaticMask } from "./ReactFiberFlags";
import { resolveClassForHotReloading, resolveForwardRefForHotReloading, resolveFunctionForHotReloading } from "./ReactFiberHotReloading.old";
import { NoLanes } from "./ReactFiberLane.old";
import { Fiber } from "./ReactInternalTypes";
import { ConcurrentRoot, RootTag } from "./ReactRootTags";
import { ConcurrentMode, ConcurrentUpdatesByDefaultMode, NoMode, ProfileMode, StrictEffectsMode, StrictLegacyMode, TypeOfMode } from "./ReactTypeOfMode";
import { UpdateQueue } from "./ReactUpdateQueue.old";
import { ClassComponent, ForwardRef, FunctionComponent, HostRoot, IndeterminateComponent, SimpleMemoComponent, WorkTag } from "./ReactWorkTags";

let hasBadMapPolyfill: boolean;

if (__DEV__) {
  hasBadMapPolyfill = false;
  try {
    const nonExtensibleObject = Object.preventExtensions({});
    /* eslint-disable no-new */
    new Map([[nonExtensibleObject, null]]);
    new Set([nonExtensibleObject]);
    /* eslint-enable no-new */
  } catch (e) {
    // TODO: Consider warning about bad polyfills
    hasBadMapPolyfill = true;
  }
}

class FiberNode implements Fiber {
  /**
   * fiber 节点类型
   */
  tag: WorkTag;
  key: string | null;
  elementType: null;
  type: null;
  stateNode: null;
  return: null;
  child: null;
  sibling: null;
  index: number;
  ref: null;
  pendingProps: mixed;
  memoizedProps: null;
  updateQueue: mixed;
  memoizedState: null;
  dependencies: null;
  mode: TypeOfMode;
  flags: Flags;
  subtreeFlags: any;
  deletions: null;
  lanes: any;
  childLanes: any;
  alternate: null;

  actualDuration?: number;
  actualStartTime?: number;
  selfBaseDuration?: number;
  treeBaseDuration?: number;
  _debugSource: null;
  _debugOwner: null;
  _debugNeedsRemount?: boolean;
  _debugHookTypes: null;

  nextEffect?: Fiber | null;
  firstEffect?: Fiber | null;
  lastEffect?: Fiber | null;
  _debugIsCurrentlyTiming?: boolean | undefined;

  constructor( tag: WorkTag, pendingProps: mixed, key: null | string, mode: TypeOfMode) {
    // Instance
    this.tag = tag;
    this.key = key;
    this.elementType = null;
    this.type = null;
    this.stateNode = null;
  
    // Fiber
    this.return = null;
    this.child = null;
    this.sibling = null;
    this.index = 0;
  
    this.ref = null;
  
    this.pendingProps = pendingProps;
    this.memoizedProps = null;
    this.updateQueue = null;
    this.memoizedState = null;
    this.dependencies = null;
  
    this.mode = mode;
  
    // Effects
    this.flags = NoFlags;
    this.subtreeFlags = NoFlags;
    this.deletions = null;
  
    this.lanes = NoLanes;
    this.childLanes = NoLanes;
  
    this.alternate = null;
    
  
    if (enableProfilerTimer) {
      // Note: The following is done to avoid a v8 performance cliff.
      //
      // Initializing the fields below to smis and later updating them with
      // double values will cause Fibers to end up having separate shapes.
      // This behavior/bug has something to do with Object.preventExtension().
      // Fortunately this only impacts DEV builds.
      // Unfortunately it makes React unusably slow for some applications.
      // To work around this, initialize the fields below with doubles.
      //
      // Learn more about this here:
      // https://github.com/facebook/react/issues/14365
      // https://bugs.chromium.org/p/v8/issues/detail?id=8538
      this.actualDuration = Number.NaN;
      this.actualStartTime = Number.NaN;
      this.selfBaseDuration = Number.NaN;
      this.treeBaseDuration = Number.NaN;
  
      // It's okay to replace the initial doubles with smis after initialization.
      // This won't trigger the performance cliff mentioned above,
      // and it simplifies other profiler code (including DevTools).
      this.actualDuration = 0;
      this.actualStartTime = -1;
      this.selfBaseDuration = 0;
      this.treeBaseDuration = 0;
    }
  
    if (__DEV__) {
      // This isn't directly used but is handy for debugging internals:
  
      this._debugSource = null;
      this._debugOwner = null;
      this._debugNeedsRemount = false;
      this._debugHookTypes = null;
      if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
        Object.preventExtensions(this);
      }
    }
  }
}

const createFiber = function(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
): Fiber {
  // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
  return new FiberNode(tag, pendingProps, key, mode);
};


export function createHostRootFiber(
  tag: RootTag,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
): Fiber {
  /**
   * 这里对Fiber设置一些标记
   */
  let mode: TypeOfMode;
  if (tag === ConcurrentRoot) {
    mode = ConcurrentMode;
    /**
     * 是否开启React严格类型检查
     */
    if (isStrictMode === true) {
      mode |= StrictLegacyMode;

      if (enableStrictEffects) {
        mode |= StrictEffectsMode;
      }
    } else if (enableStrictEffects && createRootStrictEffectsByDefault) {
      mode |= StrictLegacyMode | StrictEffectsMode;
    }
    if (
      // We only use this flag for our repo tests to check both behaviors.
      // TODO: Flip this flag and rename it something like "forceConcurrentByDefaultForTesting"
      !enableSyncDefaultUpdates ||
      // Only for internal experiments.
      (allowConcurrentByDefault && concurrentUpdatesByDefaultOverride)
    ) {
      mode |= ConcurrentUpdatesByDefaultMode;
    }
  } else {
    mode = NoMode;
  }

  if (enableProfilerTimer && isDevToolsPresent) {
    // Always collect profile timings when DevTools are present.
    // This enables DevTools to start capturing timing at any point–
    // Without some nodes in the tree having empty base times.
    mode |= ProfileMode;
  }

  return createFiber(HostRoot, null, null, mode);
}


// Used for stashing WIP properties to replay failed work in DEV.
export function assignFiberPropertiesInDEV(
  target: Fiber | null,
  source: Fiber,
): Fiber {
  if (target === null) {
    // This Fiber's initial properties will always be overwritten.
    // We only use a Fiber to ensure the same hidden class so DEV isn't slow.
    target = createFiber(IndeterminateComponent, null, null, NoMode);
  }

  // This is intentionally written as a list of all properties.
  // We tried to use Object.assign() instead but this is called in
  // the hottest path, and Object.assign() was too slow:
  // https://github.com/facebook/react/issues/12502
  // This code is DEV-only so size is not a concern.

  target.tag = source.tag;
  target.key = source.key;
  target.elementType = source.elementType;
  target.type = source.type;
  target.stateNode = source.stateNode;
  target.return = source.return;
  target.child = source.child;
  target.sibling = source.sibling;
  target.index = source.index;
  target.ref = source.ref;
  target.pendingProps = source.pendingProps;
  target.memoizedProps = source.memoizedProps;
  target.updateQueue = source.updateQueue;
  target.memoizedState = source.memoizedState;
  target.dependencies = source.dependencies;
  target.mode = source.mode;
  target.flags = source.flags;
  target.subtreeFlags = source.subtreeFlags;
  target.deletions = source.deletions;
  target.lanes = source.lanes;
  target.childLanes = source.childLanes;
  target.alternate = source.alternate;
  if (enableProfilerTimer) {
    target.actualDuration = source.actualDuration;
    target.actualStartTime = source.actualStartTime;
    target.selfBaseDuration = source.selfBaseDuration;
    target.treeBaseDuration = source.treeBaseDuration;
  }

  target._debugSource = source._debugSource;
  target._debugOwner = source._debugOwner;
  target._debugNeedsRemount = source._debugNeedsRemount;
  target._debugHookTypes = source._debugHookTypes;
  return target;
}


export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode,
    );
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    if (__DEV__) {
      // DEV-only fields

      workInProgress._debugSource = current._debugSource;
      workInProgress._debugOwner = current._debugOwner;
      workInProgress._debugHookTypes = current._debugHookTypes;
    }

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    // Needed because Blocks store data on type.
    workInProgress.type = current.type;

    // We already have an alternate.
    // Reset the effect tag.
    workInProgress.flags = NoFlags;

    // The effects are no longer valid.
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;

    if (enableProfilerTimer) {
      // We intentionally reset, rather than copy, actualDuration & actualStartTime.
      // This prevents time from endlessly accumulating in new commits.
      // This has the downside of resetting values for different priority renders,
      // But works for yielding (the common case) and should support resuming.
      workInProgress.actualDuration = 0;
      workInProgress.actualStartTime = -1;
    }
  }

  // Reset all effects except static ones.
  // Static effects are not specific to a render.
  workInProgress.flags = current.flags & StaticMask;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  // Clone the dependencies object. This is mutated during the render phase, so
  // it cannot be shared with the current fiber.
  const currentDependencies = current.dependencies;
  workInProgress.dependencies =
    currentDependencies === null
      ? null
      : {
          lanes: currentDependencies.lanes,
          firstContext: currentDependencies.firstContext,
        };

  // These will be overridden during the parent's reconciliation
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;

  if (enableProfilerTimer) {
    workInProgress.selfBaseDuration = current.selfBaseDuration;
    workInProgress.treeBaseDuration = current.treeBaseDuration;
  }

  if (__DEV__) {
    workInProgress._debugNeedsRemount = current._debugNeedsRemount;
    switch (workInProgress.tag) {
      case IndeterminateComponent:
      case FunctionComponent:
      case SimpleMemoComponent:
        workInProgress.type = resolveFunctionForHotReloading(current.type);
        break;
      case ClassComponent:
        workInProgress.type = resolveClassForHotReloading(current.type);
        break;
      case ForwardRef:
        workInProgress.type = resolveForwardRefForHotReloading(current.type);
        break;
      default:
        break;
    }
  }

  return workInProgress;
}
