/**
 * 这个文件的内容实际上是动态生成的，在不同的环境下，定义不一样。这里我们只关注react-dom的部分，直接把react-dom的拿过来
 */

import { OffscreenMode, ReactNodeList } from '../../shared/ReactTypes'

export * from './forks/ReactFiberHostConfig.dom'

/**
 * react native才支持
 */
export const supportsPersistence = false
export const getOffscreenContainerProps = ( mode: OffscreenMode,
  children: ReactNodeList) => {}