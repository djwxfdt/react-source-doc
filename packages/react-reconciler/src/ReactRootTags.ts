
/**
 * LegacyRoot | ConcurrentRoot
 */
export type RootTag = 0 | 1;

/**
 * 传统的模式，ReactDOM.render创建的fiberRoot就是这种
 */
export const LegacyRoot = 0;

/**
 * 并发模式，属于实验性的。可以手动创建
 */
export const ConcurrentRoot = 1;