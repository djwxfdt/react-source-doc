
// /**
//  * 是否启用性能分析的标志，由webpack设置的全局标记
//  */
declare var __VARIANT__:boolean | undefined

declare var setImmediate: Function

interface Navigator extends Navigator {
  scheduling?: {
    /**
     * 调用该函数后如果当前有input事件正在调度，则返回true
     * 是facebook贡献的代码，只有chrome或者android的webview支持
     */
    isInputPending?: Function
  }

}