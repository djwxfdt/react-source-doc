import { allowConcurrentByDefault, createRootStrictEffectsByDefault, enableProfilerTimer, enableStrictEffects, enableSyncDefaultUpdates } from "../../shared/ReactFeatureFlags";
import { isDevToolsPresent } from "./ReactFiberDevToolsHook.old";
import { Flags, NoFlags } from "./ReactFiberFlags";
import { NoLanes } from "./ReactFiberLane.old";
import { Fiber } from "./ReactInternalTypes";
import { ConcurrentRoot, RootTag } from "./ReactRootTags";
import { ConcurrentMode, ConcurrentUpdatesByDefaultMode, NoMode, ProfileMode, StrictEffectsMode, StrictLegacyMode, TypeOfMode } from "./ReactTypeOfMode";
import { HostRoot, WorkTag } from "./ReactWorkTags";

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
  updateQueue: null;
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
