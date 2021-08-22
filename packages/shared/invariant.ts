/**
 * 这里的代码会被babel插件做转换
 * 
 */

 import formatProdErrorMessage from "./formatProdErrorMessage"

// Turns this code:
//
// invariant(condition, 'A %s message that contains %s', adj, noun);
//
// into this:
//
// if (!condition) {
//   throw Error(
//     __DEV__
//       ? `A ${adj} message that contains ${noun}`
//       : formatProdErrorMessage(ERR_CODE, adj, noun)
//   );
// }
//

/**
 * 简单重写了下，不影响效果
 */
export default function invariant(condition: boolean, format: string, ...args: any[]) {
  if (!condition) {
    const message = format.split('%s').map((str, index) => (str + args[index] || '') ).join('')
    throw Error(message)
  }
}
