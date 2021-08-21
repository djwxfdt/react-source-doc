/**
 * 这里的代码特别逗，会在编译时用react/src/ReactSharedInternals.js文件替换，说是为了防止循环调用导致不生效...我也是醉了，让别人怎么看源码
 */

// import ReactCurrentBatchConfig from './ReactCurrentBatchConfig'

// const ReactSharedInternals = {
//   ReactCurrentBatchConfig,
// };

// export default ReactSharedInternals;

export {default} from '../react/src/ReactSharedInternals'