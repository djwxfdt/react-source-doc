import { Container } from "./ReactFiberHostConfig";
import { FiberRoot, SuspenseHydrationCallbacks } from "./ReactInternalTypes";
import { RootTag } from "./ReactRootTags";

type OpaqueRoot = FiberRoot;

export function createContainer(
  containerInfo: Container,
  tag: RootTag,
  hydrate: boolean,
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
): OpaqueRoot {
  // return createFiberRoot(
  //   containerInfo,
  //   tag,
  //   hydrate,
  //   hydrationCallbacks,
  //   isStrictMode,
  //   concurrentUpdatesByDefaultOverride,
  // );
}