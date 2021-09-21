
// /**
//  * 是否启用性能分析的标志，由打包工具设置的全局标记
//  */
declare let __VARIANT__:boolean | undefined

/**
 * 试验性功能开启的标记，由打包工具设置的全局标记
 */
declare let __EXPERIMENTAL__: boolean | undefined

declare let __PROFILE__: boolean | undefined

declare let __DEV__: boolean | undefined

declare let __REACT_DEVTOOLS_GLOBAL_HOOK__: boolean | undefined

declare let MSApp: any

declare let setImmediate: Function

interface Navigator extends Navigator {
  scheduling?: {
    /**
     * 调用该函数后如果当前有input事件正在调度，则返回true
     * 是facebook贡献的代码，只有chrome或者android的webview支持
     */
    isInputPending?: Function
  }
}

/**
 * flow 里面的混合类型，和any只有细微的差异，可以忽略
 */
type mixed = any

/**
 * flow 里面的非空类型
 */
type $NonMaybeType<T> = T!

/**
 * 目前没找到定义的地方
 */
type Iterator<T> = any

/**
 * 目前没找到定义的地方
 */
type Iterable<T> = any

/**
 * 目前没找到定义的地方
 */
type React$Element<T> = any

/**
 * 目前没找到定义的地方
 */
type React$Node = any

type jest = any