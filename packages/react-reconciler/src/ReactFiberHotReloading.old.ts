import { Fiber } from "./ReactInternalTypes";

export type Family = {
  current: any,
};


type RefreshHandler = (v: any) => Family | void;


let resolveFamily: RefreshHandler | null = null;
// $FlowFixMe Flow gets confused by a WeakSet feature check below.
let failedBoundaries: WeakSet<Fiber> | null = null;


export function markFailedErrorBoundaryForHotReloading(fiber: Fiber) {
  if (__DEV__) {
    if (resolveFamily === null) {
      // Hot reloading is disabled.
      return;
    }
    if (typeof WeakSet !== 'function') {
      return;
    }
    if (failedBoundaries === null) {
      failedBoundaries = new WeakSet();
    }
    failedBoundaries.add(fiber);
  }
}
