/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import { Dispatcher } from "../../react-reconciler/src/ReactInternalTypes";

 /**
  * Keeps track of the current dispatcher.
  * 调度员
  */
 const ReactCurrentDispatcher = {

  _current: null as null | Dispatcher,
   /**
    * @internal
    * @type {ReactComponent}
    */
   get current() {
     return this._current
   },

   set current(v) {
     
    this._current = v
   }
 };
 
 export default ReactCurrentDispatcher;
 