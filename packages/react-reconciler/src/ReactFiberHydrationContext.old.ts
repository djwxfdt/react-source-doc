/* eslint-disable no-case-declarations */
import { enableSuspenseServerRenderer } from "../../shared/ReactFeatureFlags";
import { createFiberFromDehydratedFragment, createFiberFromHostInstanceForDeletion } from "./ReactFiber.old";
import { ChildDeletion, Hydrating, Placement } from "./ReactFiberFlags";
import { canHydrateInstance, canHydrateSuspenseInstance, canHydrateTextInstance, didNotFindHydratableContainerInstance, didNotFindHydratableContainerSuspenseInstance, didNotFindHydratableContainerTextInstance, didNotFindHydratableInstance, didNotFindHydratableSuspenseInstance, didNotFindHydratableTextInstance, didNotHydrateContainerInstance, didNotHydrateInstance, getFirstHydratableChild, getNextHydratableSibling, HydratableInstance, Instance, supportsHydration, SuspenseInstance, TextInstance } from "./ReactFiberHostConfig";
import { OffscreenLane } from "./ReactFiberLane.old";
import { SuspenseState } from "./ReactFiberSuspenseComponent.old";
import { Fiber } from "./ReactInternalTypes";
import { HostRoot, HostComponent, HostText, SuspenseComponent } from "./ReactWorkTags";

let hydrationParentFiber: null | Fiber = null;
let nextHydratableInstance: null | HydratableInstance = null;
let isHydrating = false;

export function resetHydrationState(): void {
  if (!supportsHydration) {
    return;
  }

  hydrationParentFiber = null;
  nextHydratableInstance = null;
  isHydrating = false;
}

export function enterHydrationState(fiber: Fiber): boolean {
  if (!supportsHydration) {
    return false;
  }

  const parentInstance = fiber.stateNode.containerInfo;
  nextHydratableInstance = getFirstHydratableChild(parentInstance);
  hydrationParentFiber = fiber;
  isHydrating = true;
  return true;
}


function insertNonHydratedInstance(returnFiber: Fiber, fiber: Fiber) {
  fiber.flags = (fiber.flags & ~Hydrating) | Placement;
  if (__DEV__) {
    switch (returnFiber.tag) {
      case HostRoot: {
        const parentContainer = returnFiber.stateNode.containerInfo;
        switch (fiber.tag) {
          case HostComponent:
            const type = fiber.type;
            const props = fiber.pendingProps;
            didNotFindHydratableContainerInstance(parentContainer, type, props);
            break;
          case HostText:
            const text = fiber.pendingProps;
            didNotFindHydratableContainerTextInstance(parentContainer, text);
            break;
          case SuspenseComponent:
            didNotFindHydratableContainerSuspenseInstance(parentContainer);
            break;
        }
        break;
      }
      case HostComponent: {
        const parentType = returnFiber.type;
        const parentProps = returnFiber.memoizedProps;
        const parentInstance = returnFiber.stateNode;
        switch (fiber.tag) {
          case HostComponent:
            const type = fiber.type;
            const props = fiber.pendingProps;
            didNotFindHydratableInstance(
              parentType,
              parentProps,
              parentInstance,
              type,
              props,
            );
            break;
          case HostText:
            const text = fiber.pendingProps;
            didNotFindHydratableTextInstance(
              parentType,
              parentProps,
              parentInstance,
              text,
            );
            break;
          case SuspenseComponent:
            didNotFindHydratableSuspenseInstance(
              parentType,
              parentProps,
              parentInstance,
            );
            break;
        }
        break;
      }
      default:
        return;
    }
  }
}

function tryHydrate(fiber: Fiber, nextInstance: any) {
  switch (fiber.tag) {
    case HostComponent: {
      const type = fiber.type;
      const props = fiber.pendingProps;
      const instance = canHydrateInstance(nextInstance, type, props);
      if (instance !== null) {
        fiber.stateNode = (instance as Instance);
        return true;
      }
      return false;
    }
    case HostText: {
      const text = fiber.pendingProps;
      const textInstance = canHydrateTextInstance(nextInstance, text);
      if (textInstance !== null) {
        fiber.stateNode = (textInstance as TextInstance);
        return true;
      }
      return false;
    }
    case SuspenseComponent: {
      if (enableSuspenseServerRenderer) {
        const suspenseInstance: null | SuspenseInstance = canHydrateSuspenseInstance(
          nextInstance,
        );
        if (suspenseInstance !== null) {
          const suspenseState: SuspenseState = {
            dehydrated: suspenseInstance,
            retryLane: OffscreenLane,
          };
          fiber.memoizedState = suspenseState;
          // Store the dehydrated fragment as a child fiber.
          // This simplifies the code for getHostSibling and deleting nodes,
          // since it doesn't have to consider all Suspense boundaries and
          // check if they're dehydrated ones or not.
          const dehydratedFragment = createFiberFromDehydratedFragment(
            suspenseInstance,
          );
          dehydratedFragment.return = fiber;
          fiber.child = dehydratedFragment;
          return true;
        }
      }
      return false;
    }
    default:
      return false;
  }
}

function deleteHydratableInstance(
  returnFiber: Fiber,
  instance: HydratableInstance,
) {
  if (__DEV__) {
    switch (returnFiber.tag) {
      case HostRoot:
        didNotHydrateContainerInstance(
          returnFiber.stateNode.containerInfo,
          instance,
        );
        break;
      case HostComponent:
        didNotHydrateInstance(
          returnFiber.type,
          returnFiber.memoizedProps,
          returnFiber.stateNode,
          instance,
        );
        break;
    }
  }

  const childToDelete = createFiberFromHostInstanceForDeletion();
  childToDelete.stateNode = instance;
  childToDelete.return = returnFiber;

  const deletions = returnFiber.deletions;
  if (deletions === null) {
    returnFiber.deletions = [childToDelete];
    returnFiber.flags |= ChildDeletion;
  } else {
    deletions.push(childToDelete);
  }
}


export function tryToClaimNextHydratableInstance(fiber: Fiber): void {
  if (!isHydrating) {
    return;
  }
  let nextInstance = nextHydratableInstance;
  if (!nextInstance) {
    // Nothing to hydrate. Make it an insertion.
    insertNonHydratedInstance((hydrationParentFiber as any), fiber);
    isHydrating = false;
    hydrationParentFiber = fiber;
    return;
  }
  const firstAttemptedInstance = nextInstance;
  if (!tryHydrate(fiber, nextInstance)) {
    // If we can't hydrate this instance let's try the next one.
    // We use this as a heuristic. It's based on intuition and not data so it
    // might be flawed or unnecessary.
    nextInstance = getNextHydratableSibling(firstAttemptedInstance);
    if (!nextInstance || !tryHydrate(fiber, nextInstance)) {
      // Nothing to hydrate. Make it an insertion.
      insertNonHydratedInstance((hydrationParentFiber as any), fiber);
      isHydrating = false;
      hydrationParentFiber = fiber;
      return;
    }
    // We matched the next one, we'll now assume that the first one was
    // superfluous and we'll delete it. Since we can't eagerly delete it
    // we'll have to schedule a deletion. To do that, this node needs a dummy
    // fiber associated with it.
    deleteHydratableInstance(
      (hydrationParentFiber as any),
      firstAttemptedInstance,
    );
  }
  hydrationParentFiber = fiber;
  nextHydratableInstance = getFirstHydratableChild((nextInstance as any));
}
