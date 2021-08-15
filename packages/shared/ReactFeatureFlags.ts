/**
 * 这些flag会在未来的某一天开启
 */

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


export const enableCache = __EXPERIMENTAL__;

export const enableProfilerTimer = __PROFILE__;

export const enableProfilerCommitHooks = __PROFILE__;

export const enableUpdaterTracking = __PROFILE__;

export const enableStrictEffects = __DEV__;
