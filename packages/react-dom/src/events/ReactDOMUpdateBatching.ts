import { needsStateRestore, restoreStateIfNeeded } from "./ReactDOMControlledComponent";

let isInsideEventHandler = false;


let flushSyncImpl = function() {};


let batchedUpdatesImpl = function(fn: any, bookkeeping: any, b?: any) {
  return fn(bookkeeping);
};
let discreteUpdatesImpl = function(fn: any, a: any, b: any, c: any, d: any) {
  return fn(a, b, c, d);
};

function finishEventHandler() {
  // Here we wait until all updates have propagated, which is important
  // when using controlled components within layers:
  // https://github.com/facebook/react/issues/1698
  // Then we restore state of any controlled component.
  const controlledComponentsHavePendingUpdates = needsStateRestore();
  if (controlledComponentsHavePendingUpdates) {
    // If a controlled event was fired, we may need to restore the state of
    // the DOM node back to the controlled value. This is necessary when React
    // bails out of the update without touching the DOM.
    // TODO: Restore state in the microtask, after the discrete updates flush,
    // instead of early flushing them here.
    flushSyncImpl();
    restoreStateIfNeeded();
  }
}


export function batchedUpdates(fn: any, a?: any, b?: any) {
  if (isInsideEventHandler) {
    // If we are currently inside another batch, we need to wait until it
    // fully completes before restoring state.
    return fn(a, b);
  }
  isInsideEventHandler = true;
  try {
    return batchedUpdatesImpl(fn, a, b);
  } finally {
    isInsideEventHandler = false;
    finishEventHandler();
  }
}