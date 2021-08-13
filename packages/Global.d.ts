
// /**
//  * 是否启用性能分析的标志，由webpack设置的全局标记
//  */
declare var __VARIANT__:boolean | undefined

declare var setImmediate: Function

interface Navigator extends Navigator {
  scheduling?: {
    isInputPending?: Function
  }

}