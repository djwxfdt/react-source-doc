import { enableCache } from "../../shared/ReactFeatureFlags";
import { REACT_CONTEXT_TYPE } from "../../shared/ReactSymbols";
import { ReactContext } from "../../shared/ReactTypes";
import { Lanes } from "./ReactFiberLane.old";
import { popProvider, pushProvider } from "./ReactFiberNewContext.old";
import { Fiber, FiberRoot } from "./ReactInternalTypes";

export type Cache = Map<() => mixed, mixed>;

let pooledCache: Cache | null = null;


export const CacheContext: ReactContext<Cache> = enableCache
  ? {
      $$typeof: REACT_CONTEXT_TYPE,
      // We don't use Consumer/Provider for Cache components. So we'll cheat.
      Consumer: (null as any),
      Provider: (null as any),
      // We'll initialize these at the root.
      _currentValue: (null as any),
      _currentValue2: (null as any),
      _threadCount: 0,
    }
  : (null as any);

export function pushCacheProvider(workInProgress: Fiber, cache: Cache) {
  if (!enableCache) {
    return;
  }
  pushProvider(workInProgress, CacheContext, cache);
}


export function popCacheProvider(workInProgress: Fiber, cache: Cache) {
  if (!enableCache) {
    return;
  }
  popProvider(CacheContext, workInProgress);
}

export function pushRootCachePool(root: FiberRoot) {
  if (!enableCache) {
    return;
  }
  // When we start rendering a tree, read the pooled cache for this render
  // from `root.pooledCache`. If it's currently `null`, we will lazily
  // initialize it the first type it's requested. However, we only mutate
  // the root itself during the complete/unwind phase of the HostRoot.
  pooledCache = root.pooledCache as any;
}

export function popRootCachePool(root: FiberRoot, renderLanes: Lanes) {
  if (!enableCache) {
    return;
  }
  // The `pooledCache` variable points to the cache that was used for new
  // cache boundaries during this render, if any. Stash it on the root so that
  // parallel transitions may share the same cache. We will clear this field
  // once all the transitions that depend on it (which we track with
  // `pooledCacheLanes`) have committed.
  root.pooledCache = pooledCache;
  if (pooledCache !== null) {
    root.pooledCacheLanes! |= renderLanes;
  }
}