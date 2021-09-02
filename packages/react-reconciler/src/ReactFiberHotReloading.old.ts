import { REACT_FORWARD_REF_TYPE } from "../../shared/ReactSymbols";
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

export function resolveFunctionForHotReloading(type: any): any {
  if (__DEV__) {
    if (resolveFamily === null) {
      // Hot reloading is disabled.
      return type;
    }
    const family = resolveFamily(type);
    if (family === undefined) {
      return type;
    }
    // Use the latest known implementation.
    return family.current;
  } else {
    return type;
  }
}

export function resolveClassForHotReloading(type: any): any {
  // No implementation differences.
  return resolveFunctionForHotReloading(type);
}

export function resolveForwardRefForHotReloading(type: any): any {
  if (__DEV__) {
    if (resolveFamily === null) {
      // Hot reloading is disabled.
      return type;
    }
    const family = resolveFamily(type);
    if (family === undefined) {
      // Check if we're dealing with a real forwardRef. Don't want to crash early.
      if (
        type !== null &&
        type !== undefined &&
        typeof type.render === 'function'
      ) {
        // ForwardRef is special because its resolved .type is an object,
        // but it's possible that we only have its inner render function in the map.
        // If that inner render function is different, we'll build a new forwardRef type.
        const currentRender = resolveFunctionForHotReloading(type.render);
        if (type.render !== currentRender) {
          const syntheticType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render: currentRender,
          };
          if (type.displayName !== undefined) {
            (syntheticType as any).displayName = type.displayName;
          }
          return syntheticType;
        }
      }
      return type;
    }
    // Use the latest known implementation.
    return family.current;
  } else {
    return type;
  }
}
