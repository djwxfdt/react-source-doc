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

export const disableLegacyContext = false;


export const enableCache = __EXPERIMENTAL__;

/**
 * 是否开启性能监视器
 */
export const enableProfilerTimer = __PROFILE__;

export const enableProfilerCommitHooks = __PROFILE__;

export const enableSchedulingProfiler = __PROFILE__;

export const enableUpdaterTracking = __PROFILE__;

/**
 * React 18的功能，开启后，react将有意的调用两次effects, mount -> unmount -> mount。用于检查effect是否有问题
 * 
 * 只在开发模式生效
 */
export const enableStrictEffects = __DEV__;
