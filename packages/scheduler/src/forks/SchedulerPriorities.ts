/**
 * 调度系统内部使用的一些优先级常量
 */



export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;
/**
 * 
 */
export const NoPriority = 0;

/**
 * 立即执行优先级
 */
export const ImmediatePriority = 1;

/**
 * 用户阻塞级别的优先级， 最高250ms过期
 */
export const UserBlockingPriority = 2;

/**
 * 普通优先级， 最高5s过期
 */
export const NormalPriority = 3;

/**
 * 低优先级， 最高10s过期
 */
export const LowPriority = 4;

/**
 * 空闲时优先级，如果浏览器未空闲则永不执行
 */
export const IdlePriority = 5;