import { enableCache } from "../../shared/ReactFeatureFlags";
import { ReactContext } from "../../shared/ReactTypes";
import { Lanes } from "./ReactFiberLane.old";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { ClassComponent, HostRoot, HostComponent, HostPortal, SuspenseComponent, SuspenseListComponent, ContextProvider, OffscreenComponent, LegacyHiddenComponent, CacheComponent } from "./ReactWorkTags";

export function unwindInterruptedWork(interruptedWork: Fiber, renderLanes: Lanes) {
  // switch (interruptedWork.tag) {
  //   case ClassComponent: {
  //     const childContextTypes = interruptedWork.type.childContextTypes;
  //     if (childContextTypes !== null && childContextTypes !== undefined) {
  //       popLegacyContext(interruptedWork);
  //     }
  //     break;
  //   }
  //   case HostRoot: {
  //     if (enableCache) {
  //       const root: FiberRoot = interruptedWork.stateNode;
  //       popRootCachePool(root, renderLanes);

  //       const cache: Cache = interruptedWork.memoizedState.cache;
  //       popCacheProvider(interruptedWork, cache);
  //     }
  //     popHostContainer(interruptedWork);
  //     popTopLevelLegacyContextObject(interruptedWork);
  //     resetMutableSourceWorkInProgressVersions();
  //     break;
  //   }
  //   case HostComponent: {
  //     popHostContext(interruptedWork);
  //     break;
  //   }
  //   case HostPortal:
  //     popHostContainer(interruptedWork);
  //     break;
  //   case SuspenseComponent:
  //     popSuspenseContext(interruptedWork);
  //     break;
  //   case SuspenseListComponent:
  //     popSuspenseContext(interruptedWork);
  //     break;
  //   case ContextProvider:
  //     const context: ReactContext<any> = interruptedWork.type._context;
  //     popProvider(context, interruptedWork);
  //     break;
  //   case OffscreenComponent:
  //   case LegacyHiddenComponent:
  //     popRenderLanes(interruptedWork);
  //     if (enableCache) {
  //       const spawnedCachePool: SpawnedCachePool | null = (interruptedWork.updateQueue: any);
  //       if (spawnedCachePool !== null) {
  //         popCachePool(interruptedWork);
  //       }
  //     }

  //     break;
  //   case CacheComponent:
  //     if (enableCache) {
  //       const cache: Cache = interruptedWork.memoizedState.cache;
  //       popCacheProvider(interruptedWork, cache);
  //     }
  //     break;
  //   default:
  //     break;
  // }
}
