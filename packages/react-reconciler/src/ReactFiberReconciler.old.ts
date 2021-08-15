import { Container } from "./ReactFiberHostConfig";
import { createFiberRoot } from "./ReactFiberRoot.old";
import { FiberRoot, SuspenseHydrationCallbacks } from "./ReactInternalTypes";
import { RootTag } from "./ReactRootTags";

type OpaqueRoot = FiberRoot;

/**
 * 创建 FiberRoot 对象,直接调用createFiberRoot
 */
export function createContainer(
  containerInfo: Container,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
): OpaqueRoot {
  return createFiberRoot(
    containerInfo,
    tag,
    hydrate,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
  );
}