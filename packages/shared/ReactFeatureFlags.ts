/**
 * 这些flag会在未来的某一天开启
 */

// Adds verbose console logging for e.g. state updates, suspense, and work loop stuff.
// Intended to enable React core members to more easily debug scheduling issues in DEV builds.
export const enableDebugTracing = false;

/**
 * 不启用新的协调器
 */
export const enableNewReconciler = false;

/**
 * 不启用，用于跟踪loading状态以及hydration回调的触发
 */
export const enableSuspenseCallback = false;

export const enableSyncDefaultUpdates = true;

export const allowConcurrentByDefault = false;

export const createRootStrictEffectsByDefault = false;

export const disableLegacyContext = false;


export const enableCache = __EXPERIMENTAL__;

/**
 * 是否开启性能监视器
 */
export const enableProfilerTimer = __PROFILE__;

export const enableProfilerCommitHooks = __PROFILE__;

export const enableSchedulingProfiler = __PROFILE__;

export const enableUpdaterTracking = __PROFILE__;

// Phase param passed to onRender callback differentiates between an "update" and a "cascading-update".
export const enableProfilerNestedUpdatePhase = __PROFILE__;

/**
 * React 18的功能，开启后，react将有意的调用两次effects, mount -> unmount -> mount。用于检查effect是否有问题
 * 
 * 只在开发模式生效
 */
export const enableStrictEffects = __DEV__;


export const replayFailedUnitOfWorkWithInvokeGuardedCallback = __DEV__;


// Updates that occur in the render phase are not officially supported. But when
// they do occur, we defer them to a subsequent render by picking a lane that's
// not currently rendering. We treat them the same as if they came from an
// interleaved event. Remove this flag once we have migrated to the
// new behavior.
export const deferRenderPhaseUpdateToNextBatch = false;

// Profiler API accepts a function to be called when a nested update is scheduled.
// This callback accepts the component type (class instance or function) the update is scheduled for.
export const enableProfilerNestedUpdateScheduledHook = false;

export const deletedTreeCleanUpLevel = 3;

export const enableComponentStackLocations = true;

export const disableNativeComponentFrames = false;


export const skipUnmountedBoundaries = false;


export const enableScopeAPI = false;

export const enableLazyContextPropagation = false;

export const disableModulePatternComponents = false;
