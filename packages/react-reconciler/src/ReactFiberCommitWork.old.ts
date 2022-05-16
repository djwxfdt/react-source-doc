/* eslint-disable no-constant-condition */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-labels */
import { deletedTreeCleanUpLevel, enableCreateEventHandleAPI, enableProfilerCommitHooks, enableProfilerTimer, enableScopeAPI, enableStrictEffects, enableSuspenseLayoutEffectSemantics } from "../../shared/ReactFeatureFlags";
import { BeforeMutationMask, ChildDeletion, ContentReset, Hydrating, HydratingAndUpdate, LayoutMask, MutationMask, NoFlags, Passive, PassiveMask, Placement, PlacementAndUpdate, Ref, Snapshot, Update, Visibility } from "./ReactFiberFlags";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import {
  resetCurrentFiber as resetCurrentDebugFiberInDEV,
  setCurrentFiber as setCurrentDebugFiberInDEV,
} from './ReactCurrentFiber';
import { ConcurrentMode, NoMode, ProfileMode } from "./ReactTypeOfMode";
import { FunctionComponent, ForwardRef, SimpleMemoComponent, HostComponent, ClassComponent, HostPortal, HostRoot, HostText, IncompleteClassComponent, SuspenseComponent, OffscreenComponent, ScopeComponent, LegacyHiddenComponent, MemoComponent, Profiler, DehydratedFragment } from "./ReactWorkTags";
import { recordLayoutEffectDuration, recordPassiveEffectDuration, startLayoutEffectTimer, startPassiveEffectTimer } from "./ReactProfilerTimer.old";
import { FunctionComponentUpdateQueue } from "./ReactFiberHooks.old";
import { appendChild, appendChildToContainer, beforeActiveInstanceBlur, clearContainer, commitHydratedContainer, commitMount, commitTextUpdate, commitUpdate, Container, detachDeletedInstance, getPublicInstance, hideInstance, hideTextInstance, insertBefore, insertInContainerBefore, Instance, prepareForCommit, resetTextContent, supportsHydration, supportsMutation, supportsPersistence, TextInstance, unhideInstance, unhideTextInstance, UpdatePayload } from "./ReactFiberHostConfig";
import {
  NoFlags as NoHookEffect,
  HasEffect as HookHasEffect,
  Layout as HookLayout,
  Passive as HookPassive,
  HookFlags,
} from './ReactHookEffectTags';
import { clearCaughtError, invokeGuardedCallback } from "../../shared/ReactErrorUtils";
import { captureCommitPhaseError, markCommitTimeOfFallback } from "./ReactFiberWorkLoop.old";
import invariant from "../../shared/invariant";
import getComponentNameFromFiber from "./getComponentNameFromFiber";
import { didWarnAboutReassigningProps } from "./ReactFiberBeginWork.old";
import { resolveDefaultProps } from "./ReactFiberLazyComponent.old";
import { SuspenseState } from "./ReactFiberSuspenseComponent.old";
import { doesFiberContain } from "./ReactFiberTreeReflection";
import { Lanes } from "./ReactFiberLane.old";
import { OffscreenState } from "./ReactFiberOffscreenComponent";
import { commitUpdateQueue, UpdateQueue } from "./ReactUpdateQueue.old";

let nextEffect: Fiber | null = null;
let inProgressLanes: Lanes | null = null;
let inProgressRoot: FiberRoot | null = null;

let offscreenSubtreeWasHidden = false;
let offscreenSubtreeIsHidden = false;


let didWarnAboutUndefinedSnapshotBeforeUpdate: Set<mixed> | null = null;
if (__DEV__) {
  didWarnAboutUndefinedSnapshotBeforeUpdate = new Set();
}

function safelyCallComponentWillUnmount(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
  instance: any,
) {
  try {
    callComponentWillUnmountWithTimer(current, instance);
  } catch (error: any) {
    reportUncaughtErrorInDEV(error);
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}

const callComponentWillUnmountWithTimer = function(current: Fiber, instance: any) {
  instance.props = current.memoizedProps;
  instance.state = current.memoizedState;
  if (
    enableProfilerTimer &&
    enableProfilerCommitHooks &&
    current.mode & ProfileMode
  ) {
    try {
      startLayoutEffectTimer();
      instance.componentWillUnmount();
    } finally {
      recordLayoutEffectDuration(current);
    }
  } else {
    instance.componentWillUnmount();
  }
};


function reportUncaughtErrorInDEV(error: Error) {
  // Wrapping each small part of the commit phase into a guarded
  // callback is a bit too slow (https://github.com/facebook/react/pull/21666).
  // But we rely on it to surface errors to DEV tools like overlays
  // (https://github.com/facebook/react/issues/21712).
  // As a compromise, rethrow only caught errors in a guard.
  if (__DEV__) {
    invokeGuardedCallback(null, () => {
      throw error;
    });
    clearCaughtError();
  }
}

function safelyCallDestroy(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
  destroy: () => void,
) {
  try {
    destroy();
  } catch (error: any) {
    reportUncaughtErrorInDEV(error);
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}


let didWarnWrongReturnPointer = false;
function ensureCorrectReturnPointer(fiber: Fiber, expectedReturnFiber: Fiber) {
  if (__DEV__) {
    if (!didWarnWrongReturnPointer && fiber.return !== expectedReturnFiber) {
      didWarnWrongReturnPointer = true;
      console.error(
        'Internal React error: Return pointer is inconsistent ' +
          'with parent.',
      );
    }
  }

  // TODO: Remove this assignment once we're confident that it won't break
  // anything, by checking the warning logs for the above invariant
  fiber.return = expectedReturnFiber;
}


export function commitPassiveMountEffects(
  root: FiberRoot,
  finishedWork: Fiber,
): void {
  nextEffect = finishedWork;
  commitPassiveMountEffects_begin(finishedWork, root);
}


function commitPassiveMountEffects_begin(subtreeRoot: Fiber, root: FiberRoot) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    const firstChild = fiber.child;
    if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && firstChild !== null) {
      ensureCorrectReturnPointer(firstChild, fiber);
      nextEffect = firstChild;
    } else {
      commitPassiveMountEffects_complete(subtreeRoot, root);
    }
  }
}

function commitPassiveMountEffects_complete(
  subtreeRoot: Fiber,
  root: FiberRoot,
) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    if ((fiber.flags & Passive) !== NoFlags) {
      setCurrentDebugFiberInDEV(fiber);
      try {
        commitPassiveMountOnFiber(root, fiber);
      } catch (error: any) {
        reportUncaughtErrorInDEV(error);
        captureCommitPhaseError(fiber, fiber.return, error);
      }
      resetCurrentDebugFiberInDEV();
    }

    if (fiber === subtreeRoot) {
      nextEffect = null;
      return;
    }

    const sibling = fiber.sibling;
    if (sibling !== null) {
      ensureCorrectReturnPointer(sibling, fiber.return!);
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}


function commitPassiveMountOnFiber(
  finishedRoot: FiberRoot,
  finishedWork: Fiber,
): void {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      if (
        enableProfilerTimer &&
        enableProfilerCommitHooks &&
        finishedWork.mode & ProfileMode
      ) {
        startPassiveEffectTimer();
        try {
          commitHookEffectListMount(HookPassive | HookHasEffect, finishedWork);
        } finally {
          recordPassiveEffectDuration(finishedWork);
        }
      } else {
        commitHookEffectListMount(HookPassive | HookHasEffect, finishedWork);
      }
      break;
    }
  }
}



function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
  deletedSubtreeRoot: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  while (nextEffect !== null) {
    const fiber = nextEffect;

    // Deletion effects fire in parent -> child order
    // TODO: Check if fiber has a PassiveStatic flag
    setCurrentDebugFiberInDEV(fiber);
    commitPassiveUnmountInsideDeletedTreeOnFiber(fiber, nearestMountedAncestor);
    resetCurrentDebugFiberInDEV();

    const child = fiber.child;
    // TODO: Only traverse subtree if it has a PassiveStatic flag. (But, if we
    // do this, still need to handle `deletedTreeCleanUpLevel` correctly.)
    if (child !== null) {
      ensureCorrectReturnPointer(child, fiber);
      nextEffect = child;
    } else {
      commitPassiveUnmountEffectsInsideOfDeletedTree_complete(
        deletedSubtreeRoot,
      );
    }
  }
}


export function commitPassiveUnmountEffects(firstChild: Fiber): void {
  nextEffect = firstChild;
  commitPassiveUnmountEffects_begin();
}

function commitPassiveUnmountEffects_begin() {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    const child = fiber.child;

    if ((nextEffect.flags & ChildDeletion) !== NoFlags) {
      const deletions = fiber.deletions;
      if (deletions !== null) {
        for (let i = 0; i < deletions.length; i++) {
          const fiberToDelete = deletions[i];
          nextEffect = fiberToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            fiberToDelete,
            fiber,
          );
        }

        if (deletedTreeCleanUpLevel >= 1) {
          // A fiber was deleted from this parent fiber, but it's still part of
          // the previous (alternate) parent fiber's list of children. Because
          // children are a linked list, an earlier sibling that's still alive
          // will be connected to the deleted fiber via its `alternate`:
          //
          //   live fiber
          //   --alternate--> previous live fiber
          //   --sibling--> deleted fiber
          //
          // We can't disconnect `alternate` on nodes that haven't been deleted
          // yet, but we can disconnect the `sibling` and `child` pointers.
          const previousFiber = fiber.alternate;
          if (previousFiber !== null) {
            let detachedChild = previousFiber.child;
            if (detachedChild !== null) {
              previousFiber.child = null;
              do {
                const detachedSibling: Fiber | null = detachedChild.sibling;
                detachedChild.sibling = null;
                detachedChild = detachedSibling;
              } while (detachedChild !== null);
            }
          }
        }

        nextEffect = fiber;
      }
    }

    if ((fiber.subtreeFlags & PassiveMask) !== NoFlags && child !== null) {
      ensureCorrectReturnPointer(child, fiber);
      nextEffect = child;
    } else {
      commitPassiveUnmountEffects_complete();
    }
  }
}




function commitPassiveUnmountInsideDeletedTreeOnFiber(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
): void {
  switch (current.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      if (
        enableProfilerTimer &&
        enableProfilerCommitHooks &&
        current.mode & ProfileMode
      ) {
        startPassiveEffectTimer();
        commitHookEffectListUnmount(
          HookPassive,
          current,
          nearestMountedAncestor,
        );
        recordPassiveEffectDuration(current);
      } else {
        commitHookEffectListUnmount(
          HookPassive,
          current,
          nearestMountedAncestor,
        );
      }
      break;
    }
  }
}

function commitPassiveUnmountEffectsInsideOfDeletedTree_complete(
  deletedSubtreeRoot: Fiber,
) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    const sibling = fiber.sibling;
    const returnFiber = fiber.return;

    if (deletedTreeCleanUpLevel >= 2) {
      // Recursively traverse the entire deleted tree and clean up fiber fields.
      // This is more aggressive than ideal, and the long term goal is to only
      // have to detach the deleted tree at the root.
      detachFiberAfterEffects(fiber);
      if (fiber === deletedSubtreeRoot) {
        nextEffect = null;
        return;
      }
    } else {
      // This is the default branch (level 0). We do not recursively clear all
      // the fiber fields. Only the root of the deleted subtree.
      if (fiber === deletedSubtreeRoot) {
        detachFiberAfterEffects(fiber);
        nextEffect = null;
        return;
      }
    }

    if (sibling !== null) {
      ensureCorrectReturnPointer(sibling, returnFiber!);
      nextEffect = sibling;
      return;
    }

    nextEffect = returnFiber;
  }
}



function commitHookEffectListMount(tag: number, finishedWork: Fiber) {
  const updateQueue: FunctionComponentUpdateQueue | null = (finishedWork.updateQueue);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & tag) === tag) {
        // Mount
        const create = effect.create;
        effect.destroy = create();

        if (__DEV__) {
          const destroy = effect.destroy;
          if (destroy !== undefined && typeof destroy !== 'function') {
            let addendum;
            if (destroy === null) {
              addendum =
                ' You returned null. If your effect does not require clean ' +
                'up, return undefined (or nothing).';
            } else if (typeof (destroy as Promise<any>).then === 'function') {
              addendum =
                '\n\nIt looks like you wrote useEffect(async () => ...) or returned a Promise. ' +
                'Instead, write the async function inside your effect ' +
                'and call it immediately:\n\n' +
                'useEffect(() => {\n' +
                '  async function fetchData() {\n' +
                '    // You can await here\n' +
                '    const response = await MyAPI.getData(someId);\n' +
                '    // ...\n' +
                '  }\n' +
                '  fetchData();\n' +
                `}, [someId]); // Or [] if effect doesn't need props or state\n\n` +
                'Learn more about data fetching with Hooks: https://reactjs.org/link/hooks-data-fetching';
            } else {
              addendum = ' You returned: ' + destroy;
            }
            console.error(
              'An effect function must not return anything besides a function, ' +
                'which is used for clean-up.%s',
              addendum,
            );
          }
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}


function detachFiberAfterEffects(fiber: Fiber) {
  const alternate = fiber.alternate;
  if (alternate !== null) {
    fiber.alternate = null;
    detachFiberAfterEffects(alternate);
  }

  // Note: Defensively using negation instead of < in case
  // `deletedTreeCleanUpLevel` is undefined.
  if (!(deletedTreeCleanUpLevel >= 2)) {
    // This is the default branch (level 0).
    fiber.child = null;
    fiber.deletions = null;
    fiber.dependencies = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.sibling = null;
    fiber.stateNode = null;
    fiber.updateQueue = null;

    if (__DEV__) {
      fiber._debugOwner = null;
    }
  } else {
    // Clear cyclical Fiber fields. This level alone is designed to roughly
    // approximate the planned Fiber refactor. In that world, `setState` will be
    // bound to a special "instance" object instead of a Fiber. The Instance
    // object will not have any of these fields. It will only be connected to
    // the fiber tree via a single link at the root. So if this level alone is
    // sufficient to fix memory issues, that bodes well for our plans.
    fiber.child = null;
    fiber.deletions = null;
    fiber.sibling = null;

    // The `stateNode` is cyclical because on host nodes it points to the host
    // tree, which has its own pointers to children, parents, and siblings.
    // The other host nodes also point back to fibers, so we should detach that
    // one, too.
    if (fiber.tag === HostComponent) {
      const hostInstance = fiber.stateNode;
      if (hostInstance !== null) {
        detachDeletedInstance(hostInstance);
      }
    }
    fiber.stateNode = null;

    // I'm intentionally not clearing the `return` field in this level. We
    // already disconnect the `return` pointer at the root of the deleted
    // subtree (in `detachFiberMutation`). Besides, `return` by itself is not
    // cyclical — it's only cyclical when combined with `child`, `sibling`, and
    // `alternate`. But we'll clear it in the next level anyway, just in case.

    if (__DEV__) {
      fiber._debugOwner = null;
    }

    if (deletedTreeCleanUpLevel >= 3) {
      // Theoretically, nothing in here should be necessary, because we already
      // disconnected the fiber from the tree. So even if something leaks this
      // particular fiber, it won't leak anything else
      //
      // The purpose of this branch is to be super aggressive so we can measure
      // if there's any difference in memory impact. If there is, that could
      // indicate a React leak we don't know about.
      fiber.return = null;
      fiber.dependencies = null;
      fiber.memoizedProps = null;
      fiber.memoizedState = null;
      fiber.pendingProps = null;
      fiber.stateNode = null;
      // TODO: Move to `commitPassiveUnmountInsideDeletedTreeOnFiber` instead.
      fiber.updateQueue = null;
    }
  }
}

function commitHookEffectListUnmount(
  flags: HookFlags,
  finishedWork: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  const updateQueue: FunctionComponentUpdateQueue | null = (finishedWork.updateQueue);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        // Unmount
        const destroy = effect.destroy;
        effect.destroy = undefined;
        if (destroy !== undefined) {
          safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy);
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}

function commitPassiveUnmountEffects_complete() {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    if ((fiber.flags & Passive) !== NoFlags) {
      setCurrentDebugFiberInDEV(fiber);
      commitPassiveUnmountOnFiber(fiber);
      resetCurrentDebugFiberInDEV();
    }

    const sibling = fiber.sibling;
    if (sibling !== null) {
      ensureCorrectReturnPointer(sibling, fiber.return!);
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}

function commitPassiveUnmountOnFiber(finishedWork: Fiber): void {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      if (
        enableProfilerTimer &&
        enableProfilerCommitHooks &&
        finishedWork.mode & ProfileMode
      ) {
        startPassiveEffectTimer();
        commitHookEffectListUnmount(
          HookPassive | HookHasEffect,
          finishedWork,
          finishedWork.return,
        );
        recordPassiveEffectDuration(finishedWork);
      } else {
        commitHookEffectListUnmount(
          HookPassive | HookHasEffect,
          finishedWork,
          finishedWork.return,
        );
      }
      break;
    }
  }
}


export function invokeLayoutEffectUnmountInDEV(fiber: Fiber): void {
  if (__DEV__ && enableStrictEffects) {
    // We don't need to re-check StrictEffectsMode here.
    // This function is only called if that check has already passed.
    switch (fiber.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        try {
          commitHookEffectListUnmount(
            HookLayout | HookHasEffect,
            fiber,
            fiber.return,
          );
        } catch (error: any) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(fiber, fiber.return, error);
        }
        break;
      }
      case ClassComponent: {
        const instance = fiber.stateNode;
        if (typeof instance.componentWillUnmount === 'function') {
          safelyCallComponentWillUnmount(fiber, fiber.return, instance);
        }
        break;
      }
    }
  }
}

export function invokePassiveEffectUnmountInDEV(fiber: Fiber): void {
  if (__DEV__ && enableStrictEffects) {
    // We don't need to re-check StrictEffectsMode here.
    // This function is only called if that check has already passed.
    switch (fiber.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        try {
          commitHookEffectListUnmount(
            HookPassive | HookHasEffect,
            fiber,
            fiber.return,
          );
        } catch (error: any) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(fiber, fiber.return, error);
        }
      }
    }
  }
}

export function invokeLayoutEffectMountInDEV(fiber: Fiber): void {
  if (__DEV__ && enableStrictEffects) {
    // We don't need to re-check StrictEffectsMode here.
    // This function is only called if that check has already passed.
    switch (fiber.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        try {
          commitHookEffectListMount(HookLayout | HookHasEffect, fiber);
        } catch (error: any) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(fiber, fiber.return, error);
        }
        break;
      }
      case ClassComponent: {
        const instance = fiber.stateNode;
        try {
          instance.componentDidMount();
        } catch (error: any) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(fiber, fiber.return, error);
        }
        break;
      }
    }
  }
}

export function invokePassiveEffectMountInDEV(fiber: Fiber): void {
  if (__DEV__ && enableStrictEffects) {
    // We don't need to re-check StrictEffectsMode here.
    // This function is only called if that check has already passed.
    switch (fiber.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        try {
          commitHookEffectListMount(HookPassive | HookHasEffect, fiber);
        } catch (error: any) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(fiber, fiber.return, error);
        }
        break;
      }
    }
  }
}

export function isSuspenseBoundaryBeingHidden(
  current: Fiber | null,
  finishedWork: Fiber,
): boolean {
  if (current !== null) {
    const oldState: SuspenseState | null = current.memoizedState;
    if (oldState === null || oldState.dehydrated !== null) {
      const newState: SuspenseState | null = finishedWork.memoizedState;
      return newState !== null && newState.dehydrated === null;
    }
  }
  return false;
}


function commitBeforeMutationEffectsDeletion(deletion: Fiber) {
  if (enableCreateEventHandleAPI) {
    // TODO (effects) It would be nice to avoid calling doesFiberContain()
    // Maybe we can repurpose one of the subtreeFlags positions for this instead?
    // Use it to store which part of the tree the focused instance is in?
    // This assumes we can safely determine that instance during the "render" phase.
    if (doesFiberContain(deletion, ((focusedInstanceHandle as any) as Fiber))) {
      shouldFireAfterActiveInstanceBlur = true;
      beforeActiveInstanceBlur(deletion);
    }
  }
}

function commitBeforeMutationEffects_begin() {
  while (nextEffect !== null) {
    const fiber = nextEffect;

    // This phase is only used for beforeActiveInstanceBlur.
    // Let's skip the whole loop if it's off.
    if (enableCreateEventHandleAPI) {
      // TODO: Should wrap this in flags check, too, as optimization
      const deletions = fiber.deletions;
      if (deletions !== null) {
        for (let i = 0; i < deletions.length; i++) {
          const deletion = deletions[i];
          commitBeforeMutationEffectsDeletion(deletion);
        }
      }
    }

    const child = fiber.child;
    if (
      (fiber.subtreeFlags & BeforeMutationMask) !== NoFlags &&
      child !== null
    ) {
      ensureCorrectReturnPointer(child, fiber);
      nextEffect = child;
    } else {
      commitBeforeMutationEffects_complete();
    }
  }
}


let focusedInstanceHandle: null | Fiber = null;
let shouldFireAfterActiveInstanceBlur = false;

export function commitBeforeMutationEffects(
  root: FiberRoot,
  firstChild: Fiber,
) {
  focusedInstanceHandle = prepareForCommit(root.containerInfo);

  nextEffect = firstChild;
  commitBeforeMutationEffects_begin();

  // We no longer need to track the active instance fiber
  const shouldFire = shouldFireAfterActiveInstanceBlur;
  shouldFireAfterActiveInstanceBlur = false;
  focusedInstanceHandle = null;

  return shouldFire;
}

function commitBeforeMutationEffectsOnFiber(finishedWork: Fiber) {
  const current = finishedWork.alternate;
  const flags = finishedWork.flags;

  if (enableCreateEventHandleAPI) {
    if (!shouldFireAfterActiveInstanceBlur && focusedInstanceHandle !== null) {
      // Check to see if the focused element was inside of a hidden (Suspense) subtree.
      // TODO: Move this out of the hot path using a dedicated effect tag.
      if (
        finishedWork.tag === SuspenseComponent &&
        isSuspenseBoundaryBeingHidden(current, finishedWork) &&
        doesFiberContain(finishedWork, focusedInstanceHandle)
      ) {
        shouldFireAfterActiveInstanceBlur = true;
        beforeActiveInstanceBlur(finishedWork);
      }
    }
  }

  if ((flags & Snapshot) !== NoFlags) {
    setCurrentDebugFiberInDEV(finishedWork);

    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        break;
      }
      case ClassComponent: {
        if (current !== null) {
          const prevProps = current.memoizedProps;
          const prevState = current.memoizedState;
          const instance = finishedWork.stateNode;
          // We could update instance props and state here,
          // but instead we rely on them being set during last render.
          // TODO: revisit this when we implement resuming.
          if (__DEV__) {
            if (
              finishedWork.type === finishedWork.elementType &&
              !didWarnAboutReassigningProps
            ) {
              if (instance.props !== finishedWork.memoizedProps) {
                console.error(
                  'Expected %s props to match memoized props before ' +
                    'getSnapshotBeforeUpdate. ' +
                    'This might either be because of a bug in React, or because ' +
                    'a component reassigns its own `this.props`. ' +
                    'Please file an issue.',
                  getComponentNameFromFiber(finishedWork) || 'instance',
                );
              }
              if (instance.state !== finishedWork.memoizedState) {
                console.error(
                  'Expected %s state to match memoized state before ' +
                    'getSnapshotBeforeUpdate. ' +
                    'This might either be because of a bug in React, or because ' +
                    'a component reassigns its own `this.state`. ' +
                    'Please file an issue.',
                  getComponentNameFromFiber(finishedWork) || 'instance',
                );
              }
            }
          }
          const snapshot = instance.getSnapshotBeforeUpdate(
            finishedWork.elementType === finishedWork.type
              ? prevProps
              : resolveDefaultProps(finishedWork.type, prevProps),
            prevState,
          );
          if (__DEV__) {
            const didWarnSet = ((didWarnAboutUndefinedSnapshotBeforeUpdate as any) as Set<mixed>);
            if (snapshot === undefined && !didWarnSet.has(finishedWork.type)) {
              didWarnSet.add(finishedWork.type);
              console.error(
                '%s.getSnapshotBeforeUpdate(): A snapshot value (or null) ' +
                  'must be returned. You have returned undefined.',
                getComponentNameFromFiber(finishedWork),
              );
            }
          }
          instance.__reactInternalSnapshotBeforeUpdate = snapshot;
        }
        break;
      }
      case HostRoot: {
        if (supportsMutation) {
          const root = finishedWork.stateNode;
          clearContainer(root.containerInfo);
        }
        break;
      }
      case HostComponent:
      case HostText:
      case HostPortal:
      case IncompleteClassComponent:
        // Nothing to do for these component types
        break;
      default: {
        invariant(
          false,
          'This unit of work tag should not have side-effects. This error is ' +
            'likely caused by a bug in React. Please file an issue.',
        );
      }
    }

    resetCurrentDebugFiberInDEV();
  }
}


function commitBeforeMutationEffects_complete() {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    setCurrentDebugFiberInDEV(fiber);
    try {
      commitBeforeMutationEffectsOnFiber(fiber);
    } catch (error: any) {
      reportUncaughtErrorInDEV(error);
      captureCommitPhaseError(fiber, fiber.return, error);
    }
    resetCurrentDebugFiberInDEV();

    const sibling = fiber.sibling;
    if (sibling !== null) {
      ensureCorrectReturnPointer(sibling, fiber.return!);
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}

function commitDeletion(
  finishedRoot: FiberRoot,
  current: Fiber,
  nearestMountedAncestor: Fiber,
): void {
  // if (supportsMutation) {
  //   // Recursively delete all host nodes from the parent.
  //   // Detach refs and call componentWillUnmount() on the whole subtree.
  //   unmountHostComponents(finishedRoot, current, nearestMountedAncestor);
  // } else {
  //   // Detach refs and call componentWillUnmount() on the whole subtree.
  //   commitNestedUnmounts(finishedRoot, current, nearestMountedAncestor);
  // }

  // detachFiberMutation(current);
}

function commitMutationEffects_begin(root: FiberRoot) {
  while (nextEffect !== null) {
    const fiber = nextEffect;

    // TODO: Should wrap this in flags check, too, as optimization
    const deletions = fiber.deletions;
    if (deletions !== null) {
      for (let i = 0; i < deletions.length; i++) {
        const childToDelete = deletions[i];
        try {
          commitDeletion(root, childToDelete, fiber);
        } catch (error: any) {
          reportUncaughtErrorInDEV(error);
          captureCommitPhaseError(childToDelete, fiber, error);
        }
      }
    }

    const child = fiber.child;
    if ((fiber.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
      ensureCorrectReturnPointer(child, fiber);
      nextEffect = child;
    } else {
      commitMutationEffects_complete(root);
    }
  }
}

function commitMutationEffects_complete(root: FiberRoot) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    setCurrentDebugFiberInDEV(fiber);
    try {
      commitMutationEffectsOnFiber(fiber, root);
    } catch (error: any) {
      reportUncaughtErrorInDEV(error);
      captureCommitPhaseError(fiber, fiber.return, error);
    }
    resetCurrentDebugFiberInDEV();

    const sibling = fiber.sibling;
    if (sibling !== null) {
      ensureCorrectReturnPointer(sibling, fiber.return!);
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}

function isHostParent(fiber: Fiber): boolean {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    fiber.tag === HostPortal
  );
}

function getHostParentFiber(fiber: Fiber): Fiber | undefined {
  let parent = fiber.return;
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
  invariant(
    false,
    'Expected to find a host parent. This error is likely caused by a bug ' +
      'in React. Please file an issue.',
  );
}


function commitPlacement(finishedWork: Fiber): void {
  if (!supportsMutation) {
    return;
  }

  // Recursively insert all host nodes into the parent.
  const parentFiber = getHostParentFiber(finishedWork);

  // Note: these two variables *must* always be updated together.
  let parent;
  let isContainer;
  const parentStateNode = parentFiber?.stateNode;
  switch (parentFiber?.tag) {
    case HostComponent:
      parent = parentStateNode;
      isContainer = false;
      break;
    case HostRoot:
      parent = parentStateNode.containerInfo;
      isContainer = true;
      break;
    case HostPortal:
      parent = parentStateNode.containerInfo;
      isContainer = true;
      break;
    // eslint-disable-next-line-no-fallthrough
    default:
      invariant(
        false,
        'Invalid host parent fiber. This error is likely caused by a bug ' +
          'in React. Please file an issue.',
      );
  }
  if (parentFiber!.flags & ContentReset) {
    // Reset the text content of the parent before doing any insertions
    resetTextContent(parent);
    // Clear ContentReset from the effect tag
    parentFiber!.flags &= ~ContentReset;
  }

  const before = getHostSibling(finishedWork);
  // We only have the top Fiber that was inserted but we need to recurse down its
  // children to find all the terminal nodes.
  if (isContainer) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
  } else {
    insertOrAppendPlacementNode(finishedWork, before, parent);
  }
}

function commitMutationEffectsOnFiber(finishedWork: Fiber, root: FiberRoot) {
  // TODO: The factoring of this phase could probably be improved. Consider
  // switching on the type of work before checking the flags. That's what
  // we do in all the other phases. I think this one is only different
  // because of the shared reconcilation logic below.
  const flags = finishedWork.flags;


  if (flags & ContentReset) {
    commitResetTextContent(finishedWork);
  }

  if (flags & Ref) {
    const current = finishedWork.alternate;
    if (current !== null) {
      commitDetachRef(current);
    }
    if (enableScopeAPI) {
      // TODO: This is a temporary solution that allowed us to transition away
      // from React Flare on www.
      if (finishedWork.tag === ScopeComponent) {
        commitAttachRef(finishedWork);
      }
    }
  }

  if (flags & Visibility) {
    // switch (finishedWork.tag) {
    //   case SuspenseComponent: {
    //     const newState: OffscreenState | null = finishedWork.memoizedState;
    //     const isHidden = newState !== null;
    //     if (isHidden) {
    //       const current = finishedWork.alternate;
    //       const wasHidden = current !== null && current.memoizedState !== null;
    //       if (!wasHidden) {
    //         // TODO: Move to passive phase
    //         markCommitTimeOfFallback();
    //       }
    //     }
    //     break;
    //   }
    //   case OffscreenComponent: {
    //     const newState: OffscreenState | null = finishedWork.memoizedState;
    //     const isHidden = newState !== null;
    //     const current = finishedWork.alternate;
    //     const wasHidden = current !== null && current.memoizedState !== null;
    //     const offscreenBoundary: Fiber = finishedWork;

    //     if (supportsMutation) {
    //       // TODO: This needs to run whenever there's an insertion or update
    //       // inside a hidden Offscreen tree.
    //       hideOrUnhideAllChildren(offscreenBoundary, isHidden);
    //     }

    //     if (enableSuspenseLayoutEffectSemantics) {
    //       if (isHidden) {
    //         if (!wasHidden) {
    //           if ((offscreenBoundary.mode & ConcurrentMode) !== NoMode) {
    //             nextEffect = offscreenBoundary;
    //             let offscreenChild = offscreenBoundary.child;
    //             while (offscreenChild !== null) {
    //               nextEffect = offscreenChild;
    //               disappearLayoutEffects_begin(offscreenChild);
    //               offscreenChild = offscreenChild.sibling;
    //             }
    //           }
    //         }
    //       } else {
    //         if (wasHidden) {
    //           // TODO: Move re-appear call here for symmetry?
    //         }
    //       }
    //       break;
    //     }
    //   }
    // }
  }

  // The following switch statement is only concerned about placement,
  // updates, and deletions. To avoid needing to add a case for every possible
  // bitmap value, we remove the secondary effects from the effect tag and
  // switch on that value.
  const primaryFlags = flags & (Placement | Update | Hydrating);
  outer: switch (primaryFlags) {
    case Placement: {
      commitPlacement(finishedWork);
      // Clear the "placement" from effect tag so that we know that this is
      // inserted, before any life-cycles like componentDidMount gets called.
      // TODO: findDOMNode doesn't rely on this any more but isMounted does
      // and isMounted is deprecated anyway so we should be able to kill this.
      finishedWork.flags &= ~Placement;
      break;
    }
    case PlacementAndUpdate: {
      // Placement
      commitPlacement(finishedWork);
      // Clear the "placement" from effect tag so that we know that this is
      // inserted, before any life-cycles like componentDidMount gets called.
      finishedWork.flags &= ~Placement;

      // Update
      const current = finishedWork.alternate;
      commitWork(current, finishedWork);
      break;
    }
    case Hydrating: {
      finishedWork.flags &= ~Hydrating;
      break;
    }
    case HydratingAndUpdate: {
      finishedWork.flags &= ~Hydrating;

      // Update
      const current = finishedWork.alternate;
      commitWork(current, finishedWork);
      break;
    }
    case Update: {
      const current = finishedWork.alternate;
      commitWork(current, finishedWork);
      break;
    }
  }
}


export function commitMutationEffects(
  root: FiberRoot,
  firstChild: Fiber,
  committedLanes: Lanes,
) {
  inProgressLanes = committedLanes;
  inProgressRoot = root;
  nextEffect = firstChild;

  commitMutationEffects_begin(root);

  inProgressLanes = null;
  inProgressRoot = null;
}

export function commitLayoutEffects(
  finishedWork: Fiber,
  root: FiberRoot,
  committedLanes: Lanes,
): void {
  inProgressLanes = committedLanes;
  inProgressRoot = root;
  nextEffect = finishedWork;

  commitLayoutEffects_begin(finishedWork, root, committedLanes);

  inProgressLanes = null;
  inProgressRoot = null;
}

function commitLayoutEffects_begin(
  subtreeRoot: Fiber,
  root: FiberRoot,
  committedLanes: Lanes,
) {
  // Suspense layout effects semantics don't change for legacy roots.
  const isModernRoot = (subtreeRoot.mode & ConcurrentMode) !== NoMode;

  while (nextEffect !== null) {
    const fiber = nextEffect;
    const firstChild = fiber.child;

    if (
      enableSuspenseLayoutEffectSemantics &&
      fiber.tag === OffscreenComponent &&
      isModernRoot
    ) {
      // Keep track of the current Offscreen stack's state.
      const isHidden = fiber.memoizedState !== null;
      const newOffscreenSubtreeIsHidden = isHidden || offscreenSubtreeIsHidden;
      if (newOffscreenSubtreeIsHidden) {
        // The Offscreen tree is hidden. Skip over its layout effects.
        commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);
        continue;
      } else {
        // TODO (Offscreen) Also check: subtreeFlags & LayoutMask
        const current = fiber.alternate;
        const wasHidden = current !== null && current.memoizedState !== null;
        const newOffscreenSubtreeWasHidden =
          wasHidden || offscreenSubtreeWasHidden;
        const prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden;
        const prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;

        // Traverse the Offscreen subtree with the current Offscreen as the root.
        offscreenSubtreeIsHidden = newOffscreenSubtreeIsHidden;
        offscreenSubtreeWasHidden = newOffscreenSubtreeWasHidden;

        if (offscreenSubtreeWasHidden && !prevOffscreenSubtreeWasHidden) {
          // This is the root of a reappearing boundary. Turn its layout effects
          // back on.
          nextEffect = fiber;
          reappearLayoutEffects_begin(fiber);
        }

        let child = firstChild;
        while (child !== null) {
          nextEffect = child;
          commitLayoutEffects_begin(
            child, // New root; bubble back up to here and stop.
            root,
            committedLanes,
          );
          child = child.sibling;
        }

        // Restore Offscreen state and resume in our-progress traversal.
        nextEffect = fiber;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);

        continue;
      }
    }

    if ((fiber.subtreeFlags & LayoutMask) !== NoFlags && firstChild !== null) {
      ensureCorrectReturnPointer(firstChild, fiber);
      nextEffect = firstChild;
    } else {
      commitLayoutMountEffects_complete(subtreeRoot, root, committedLanes);
    }
  }
}

function commitLayoutMountEffects_complete(
  subtreeRoot: Fiber,
  root: FiberRoot,
  committedLanes: Lanes,
) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    if ((fiber.flags & LayoutMask) !== NoFlags) {
      const current = fiber.alternate;
      setCurrentDebugFiberInDEV(fiber);
      try {
        commitLayoutEffectOnFiber(root, current, fiber, committedLanes);
      } catch (error: any) {
        reportUncaughtErrorInDEV(error);
        captureCommitPhaseError(fiber, fiber.return, error);
      }
      resetCurrentDebugFiberInDEV();
    }

    if (fiber === subtreeRoot) {
      nextEffect = null;
      return;
    }

    const sibling = fiber.sibling;
    if (sibling !== null) {
      ensureCorrectReturnPointer(sibling, fiber.return!);
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}

function commitLayoutEffectOnFiber(
  finishedRoot: FiberRoot,
  current: Fiber | null,
  finishedWork: Fiber,
  committedLanes: Lanes,
): void {
  if ((finishedWork.flags & LayoutMask) !== NoFlags) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        if (
          !enableSuspenseLayoutEffectSemantics ||
          !offscreenSubtreeWasHidden
        ) {
          // At this point layout effects have already been destroyed (during mutation phase).
          // This is done to prevent sibling component effects from interfering with each other,
          // e.g. a destroy function in one component should never override a ref set
          // by a create function in another component during the same commit.
          if (
            enableProfilerTimer &&
            enableProfilerCommitHooks &&
            finishedWork.mode & ProfileMode
          ) {
            try {
              startLayoutEffectTimer();
              commitHookEffectListMount(
                HookLayout | HookHasEffect,
                finishedWork,
              );
            } finally {
              recordLayoutEffectDuration(finishedWork);
            }
          } else {
            commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork);
          }
        }
        break;
      }
      case ClassComponent: {
        const instance = finishedWork.stateNode;
        if (finishedWork.flags & Update) {
          if (!offscreenSubtreeWasHidden) {
            if (current === null) {
              // We could update instance props and state here,
              // but instead we rely on them being set during last render.
              // TODO: revisit this when we implement resuming.
              if (__DEV__) {
                if (
                  finishedWork.type === finishedWork.elementType &&
                  !didWarnAboutReassigningProps
                ) {
                  if (instance.props !== finishedWork.memoizedProps) {
                    console.error(
                      'Expected %s props to match memoized props before ' +
                        'componentDidMount. ' +
                        'This might either be because of a bug in React, or because ' +
                        'a component reassigns its own `this.props`. ' +
                        'Please file an issue.',
                      getComponentNameFromFiber(finishedWork) || 'instance',
                    );
                  }
                  if (instance.state !== finishedWork.memoizedState) {
                    console.error(
                      'Expected %s state to match memoized state before ' +
                        'componentDidMount. ' +
                        'This might either be because of a bug in React, or because ' +
                        'a component reassigns its own `this.state`. ' +
                        'Please file an issue.',
                      getComponentNameFromFiber(finishedWork) || 'instance',
                    );
                  }
                }
              }
              if (
                enableProfilerTimer &&
                enableProfilerCommitHooks &&
                finishedWork.mode & ProfileMode
              ) {
                try {
                  startLayoutEffectTimer();
                  instance.componentDidMount();
                } finally {
                  recordLayoutEffectDuration(finishedWork);
                }
              } else {
                instance.componentDidMount();
              }
            } else {
              const prevProps =
                finishedWork.elementType === finishedWork.type
                  ? current.memoizedProps
                  : resolveDefaultProps(
                      finishedWork.type,
                      current.memoizedProps,
                    );
              const prevState = current.memoizedState;
              // We could update instance props and state here,
              // but instead we rely on them being set during last render.
              // TODO: revisit this when we implement resuming.
              if (__DEV__) {
                if (
                  finishedWork.type === finishedWork.elementType &&
                  !didWarnAboutReassigningProps
                ) {
                  if (instance.props !== finishedWork.memoizedProps) {
                    console.error(
                      'Expected %s props to match memoized props before ' +
                        'componentDidUpdate. ' +
                        'This might either be because of a bug in React, or because ' +
                        'a component reassigns its own `this.props`. ' +
                        'Please file an issue.',
                      getComponentNameFromFiber(finishedWork) || 'instance',
                    );
                  }
                  if (instance.state !== finishedWork.memoizedState) {
                    console.error(
                      'Expected %s state to match memoized state before ' +
                        'componentDidUpdate. ' +
                        'This might either be because of a bug in React, or because ' +
                        'a component reassigns its own `this.state`. ' +
                        'Please file an issue.',
                      getComponentNameFromFiber(finishedWork) || 'instance',
                    );
                  }
                }
              }
              if (
                enableProfilerTimer &&
                enableProfilerCommitHooks &&
                finishedWork.mode & ProfileMode
              ) {
                try {
                  startLayoutEffectTimer();
                  instance.componentDidUpdate(
                    prevProps,
                    prevState,
                    instance.__reactInternalSnapshotBeforeUpdate,
                  );
                } finally {
                  recordLayoutEffectDuration(finishedWork);
                }
              } else {
                instance.componentDidUpdate(
                  prevProps,
                  prevState,
                  instance.__reactInternalSnapshotBeforeUpdate,
                );
              }
            }
          }
        }

        // TODO: I think this is now always non-null by the time it reaches the
        // commit phase. Consider removing the type check.
        const updateQueue: UpdateQueue<
          any
        > | null = (finishedWork.updateQueue as any);
        if (updateQueue !== null) {
          if (__DEV__) {
            if (
              finishedWork.type === finishedWork.elementType &&
              !didWarnAboutReassigningProps
            ) {
              if (instance.props !== finishedWork.memoizedProps) {
                console.error(
                  'Expected %s props to match memoized props before ' +
                    'processing the update queue. ' +
                    'This might either be because of a bug in React, or because ' +
                    'a component reassigns its own `this.props`. ' +
                    'Please file an issue.',
                  getComponentNameFromFiber(finishedWork) || 'instance',
                );
              }
              if (instance.state !== finishedWork.memoizedState) {
                console.error(
                  'Expected %s state to match memoized state before ' +
                    'processing the update queue. ' +
                    'This might either be because of a bug in React, or because ' +
                    'a component reassigns its own `this.state`. ' +
                    'Please file an issue.',
                  getComponentNameFromFiber(finishedWork) || 'instance',
                );
              }
            }
          }
          // We could update instance props and state here,
          // but instead we rely on them being set during last render.
          // TODO: revisit this when we implement resuming.
          commitUpdateQueue(finishedWork, updateQueue, instance);
        }
        break;
      }
      case HostRoot: {
        // TODO: I think this is now always non-null by the time it reaches the
        // commit phase. Consider removing the type check.
        const updateQueue: UpdateQueue<
          any
        > | null = (finishedWork.updateQueue as any);
        if (updateQueue !== null) {
          let instance = null;
          if (finishedWork.child !== null) {
            switch (finishedWork.child.tag) {
              case HostComponent:
                instance = getPublicInstance(finishedWork.child.stateNode);
                break;
              case ClassComponent:
                instance = finishedWork.child.stateNode;
                break;
            }
          }
          commitUpdateQueue(finishedWork, updateQueue, instance);
        }
        break;
      }
      case HostComponent: {
        const instance: Instance = finishedWork.stateNode;

        // Renderers may schedule work to be done after host components are mounted
        // (eg DOM renderer may schedule auto-focus for inputs and form controls).
        // These effects should only be committed when components are first mounted,
        // aka when there is no current/alternate.
        if (current === null && finishedWork.flags & Update) {
          const type = finishedWork.type;
          const props = finishedWork.memoizedProps;
          commitMount(instance, type, props, finishedWork);
        }

        break;
      }
      case HostText: {
        // We have no life-cycles associated with text.
        break;
      }
      case HostPortal: {
        // We have no life-cycles associated with portals.
        break;
      }
      // case Profiler: {
      //   if (enableProfilerTimer) {
      //     const {onCommit, onRender} = finishedWork.memoizedProps;
      //     const {effectDuration} = finishedWork.stateNode;

      //     const commitTime = getCommitTime();

      //     let phase = current === null ? 'mount' : 'update';
      //     if (enableProfilerNestedUpdatePhase) {
      //       if (isCurrentUpdateNested()) {
      //         phase = 'nested-update';
      //       }
      //     }

      //     if (typeof onRender === 'function') {
      //       onRender(
      //         finishedWork.memoizedProps.id,
      //         phase,
      //         finishedWork.actualDuration,
      //         finishedWork.treeBaseDuration,
      //         finishedWork.actualStartTime,
      //         commitTime,
      //       );
      //     }

      //     if (enableProfilerCommitHooks) {
      //       if (typeof onCommit === 'function') {
      //         onCommit(
      //           finishedWork.memoizedProps.id,
      //           phase,
      //           effectDuration,
      //           commitTime,
      //         );
      //       }

      //       // Schedule a passive effect for this Profiler to call onPostCommit hooks.
      //       // This effect should be scheduled even if there is no onPostCommit callback for this Profiler,
      //       // because the effect is also where times bubble to parent Profilers.
      //       enqueuePendingPassiveProfilerEffect(finishedWork);

      //       // Propagate layout effect durations to the next nearest Profiler ancestor.
      //       // Do not reset these values until the next render so DevTools has a chance to read them first.
      //       let parentFiber = finishedWork.return;
      //       outer: while (parentFiber !== null) {
      //         switch (parentFiber.tag) {
      //           case HostRoot:
      //             const root = parentFiber.stateNode;
      //             root.effectDuration += effectDuration;
      //             break outer;
      //           case Profiler:
      //             const parentStateNode = parentFiber.stateNode;
      //             parentStateNode.effectDuration += effectDuration;
      //             break outer;
      //         }
      //         parentFiber = parentFiber.return;
      //       }
      //     }
      //   }
      //   break;
      // }
      // case SuspenseComponent: {
      //   commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
      //   break;
      // }
      // case SuspenseListComponent:
      // case IncompleteClassComponent:
      // case ScopeComponent:
      // case OffscreenComponent:
      // case LegacyHiddenComponent:
        // break;
      default:
        invariant(
          false,
          'This unit of work tag should not have side-effects. This error is ' +
            'likely caused by a bug in React. Please file an issue.',
        );
    }
  }

  if (!enableSuspenseLayoutEffectSemantics || !offscreenSubtreeWasHidden) {
    if (enableScopeAPI) {
      // TODO: This is a temporary solution that allowed us to transition away
      // from React Flare on www.
      if (finishedWork.flags & Ref && finishedWork.tag !== ScopeComponent) {
        commitAttachRef(finishedWork);
      }
    } else {
      if (finishedWork.flags & Ref) {
        commitAttachRef(finishedWork);
      }
    }
  }
}


function reappearLayoutEffectsOnFiber(node: Fiber) {
  // Turn on layout effects in a tree that previously disappeared.
  // TODO (Offscreen) Check: flags & LayoutStatic
  switch (node.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      if (
        enableProfilerTimer &&
        enableProfilerCommitHooks &&
        node.mode & ProfileMode
      ) {
        try {
          startLayoutEffectTimer();
          safelyCallCommitHookLayoutEffectListMount(node, node.return);
        } finally {
          recordLayoutEffectDuration(node);
        }
      } else {
        safelyCallCommitHookLayoutEffectListMount(node, node.return);
      }
      break;
    }
    case ClassComponent: {
      const instance = node.stateNode;
      if (typeof instance.componentDidMount === 'function') {
        safelyCallComponentDidMount(node, node.return, instance);
      }
      safelyAttachRef(node, node.return);
      break;
    }
    case HostComponent: {
      safelyAttachRef(node, node.return);
      break;
    }
  }
}


function reappearLayoutEffects_begin(subtreeRoot: Fiber) {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    const firstChild = fiber.child;

    if (fiber.tag === OffscreenComponent) {
      const isHidden = fiber.memoizedState !== null;
      if (isHidden) {
        // Nested Offscreen tree is still hidden. Don't re-appear its effects.
        reappearLayoutEffects_complete(subtreeRoot);
        continue;
      }
    }

    // TODO (Offscreen) Check: subtreeFlags & LayoutStatic
    if (firstChild !== null) {
      // This node may have been reused from a previous render, so we can't
      // assume its return pointer is correct.
      firstChild.return = fiber;
      nextEffect = firstChild;
    } else {
      reappearLayoutEffects_complete(subtreeRoot);
    }
  }
}

function reappearLayoutEffects_complete(subtreeRoot: Fiber) {
  while (nextEffect !== null) {
    const fiber = nextEffect;

    // TODO (Offscreen) Check: flags & LayoutStatic
    setCurrentDebugFiberInDEV(fiber);
    try {
      reappearLayoutEffectsOnFiber(fiber);
    } catch (error: any) {
      reportUncaughtErrorInDEV(error);
      captureCommitPhaseError(fiber, fiber.return, error);
    }
    resetCurrentDebugFiberInDEV();

    if (fiber === subtreeRoot) {
      nextEffect = null;
      return;
    }

    const sibling = fiber.sibling;
    if (sibling !== null) {
      // This node may have been reused from a previous render, so we can't
      // assume its return pointer is correct.
      sibling.return = fiber.return;
      nextEffect = sibling;
      return;
    }

    nextEffect = fiber.return;
  }
}


function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode;
    let instanceToUse;
    switch (finishedWork.tag) {
      case HostComponent:
        instanceToUse = getPublicInstance(instance);
        break;
      default:
        instanceToUse = instance;
    }
    // Moved outside to ensure DCE works with this flag
    if (enableScopeAPI && finishedWork.tag === ScopeComponent) {
      instanceToUse = instance;
    }
    if (typeof ref === 'function') {
      if (
        enableProfilerTimer &&
        enableProfilerCommitHooks &&
        finishedWork.mode & ProfileMode
      ) {
        try {
          startLayoutEffectTimer();
          ref(instanceToUse);
        } finally {
          recordLayoutEffectDuration(finishedWork);
        }
      } else {
        ref(instanceToUse);
      }
    } else {
      if (__DEV__) {
        if (!ref.hasOwnProperty('current')) {
          console.error(
            'Unexpected ref object provided for %s. ' +
              'Use either a ref-setter function or React.createRef().',
            getComponentNameFromFiber(finishedWork),
          );
        }
      }

      ref.current = instanceToUse;
    }
  }
}

function commitDetachRef(current: Fiber) {
  const currentRef = current.ref;
  if (currentRef !== null) {
    if (typeof currentRef === 'function') {
      if (
        enableProfilerTimer &&
        enableProfilerCommitHooks &&
        current.mode & ProfileMode
      ) {
        try {
          startLayoutEffectTimer();
          currentRef(null);
        } finally {
          recordLayoutEffectDuration(current);
        }
      } else {
        currentRef(null);
      }
    } else {
      currentRef.current = null;
    }
  }
}

function safelyCallCommitHookLayoutEffectListMount(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  try {
    commitHookEffectListMount(HookLayout, current);
  } catch (error: any) {
    reportUncaughtErrorInDEV(error);
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}


// Capture errors so they don't interrupt mounting.
function safelyCallComponentDidMount(
  current: Fiber,
  nearestMountedAncestor: Fiber | null,
  instance: any,
) {
  try {
    instance.componentDidMount();
  } catch (error: any) {
    reportUncaughtErrorInDEV(error);
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}

// Capture errors so they don't interrupt mounting.
function safelyAttachRef(current: Fiber, nearestMountedAncestor: Fiber | null) {
  try {
    commitAttachRef(current);
  } catch (error: any) {
    reportUncaughtErrorInDEV(error);
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}

function safelyDetachRef(current: Fiber, nearestMountedAncestor: Fiber | null) {
  const ref = current.ref;
  if (ref !== null) {
    if (typeof ref === 'function') {
      try {
        if (
          enableProfilerTimer &&
          enableProfilerCommitHooks &&
          current.mode & ProfileMode
        ) {
          try {
            startLayoutEffectTimer();
            ref(null);
          } finally {
            recordLayoutEffectDuration(current);
          }
        } else {
          ref(null);
        }
      } catch (error: any) {
        reportUncaughtErrorInDEV(error);
        captureCommitPhaseError(current, nearestMountedAncestor, error);
      }
    } else {
      ref.current = null;
    }
  }
}

function commitResetTextContent(current: Fiber) {
  if (!supportsMutation) {
    return;
  }
  resetTextContent(current.stateNode);
}

function hideOrUnhideAllChildren(finishedWork: any, isHidden: boolean) {
  // Only hide or unhide the top-most host nodes.
  let hostSubtreeRoot = null;

  if (supportsMutation) {
    // We only have the top Fiber that was inserted but we need to recurse down its
    // children to find all the terminal nodes.
    let node: Fiber = finishedWork;
    while (true) {
      if (node.tag === HostComponent) {
        if (hostSubtreeRoot === null) {
          hostSubtreeRoot = node;

          const instance = node.stateNode;
          if (isHidden) {
            hideInstance(instance);
          } else {
            unhideInstance(node.stateNode, node.memoizedProps);
          }
        }
      } else if (node.tag === HostText) {
        if (hostSubtreeRoot === null) {
          const instance = node.stateNode;
          if (isHidden) {
            hideTextInstance(instance);
          } else {
            unhideTextInstance(instance, node.memoizedProps);
          }
        }
      } else if (
        (node.tag === OffscreenComponent ||
          node.tag === LegacyHiddenComponent) &&
        (node.memoizedState as OffscreenState) !== null &&
        node !== finishedWork
      ) {
        // Found a nested Offscreen component that is hidden.
        // Don't search any deeper. This tree should remain hidden.
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === finishedWork) {
        return;
      }
      while (node.sibling === null) {
        if (node.return === null || node.return === finishedWork) {
          return;
        }

        if (hostSubtreeRoot === node) {
          hostSubtreeRoot = null;
        }

        node = node.return;
      }

      if (hostSubtreeRoot === node) {
        hostSubtreeRoot = null;
      }

      node.sibling.return = node.return;
      node = node.sibling;
    }
  }
}

function commitWork(current: Fiber | null, finishedWork: Fiber): void {
  if (!supportsMutation) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent: {
        // Layout effects are destroyed during the mutation phase so that all
        // destroy functions for all fibers are called before any create functions.
        // This prevents sibling component effects from interfering with each other,
        // e.g. a destroy function in one component should never override a ref set
        // by a create function in another component during the same commit.
        // TODO: Check if we're inside an Offscreen subtree that disappeared
        // during this commit. If so, we would have already unmounted its
        // layout hooks. (However, since we null out the `destroy` function
        // right before calling it, the behavior is already correct, so this
        // would mostly be for modeling purposes.)
        if (
          enableProfilerTimer &&
          enableProfilerCommitHooks &&
          finishedWork.mode & ProfileMode
        ) {
          try {
            startLayoutEffectTimer();
            commitHookEffectListUnmount(
              HookLayout | HookHasEffect,
              finishedWork,
              finishedWork.return,
            );
          } finally {
            recordLayoutEffectDuration(finishedWork);
          }
        } else {
          commitHookEffectListUnmount(
            HookLayout | HookHasEffect,
            finishedWork,
            finishedWork.return,
          );
        }
        return;
      }
      case Profiler: {
        return;
      }
      // case SuspenseComponent: {
      //   commitSuspenseCallback(finishedWork);
      //   attachSuspenseRetryListeners(finishedWork);
      //   return;
      // }
      // case SuspenseListComponent: {
      //   attachSuspenseRetryListeners(finishedWork);
      //   return;
      // }
      case HostRoot: {
        if (supportsHydration) {
          const root: FiberRoot = finishedWork.stateNode;
          if (root.hydrate) {
            // We've just hydrated. No need to hydrate again.
            root.hydrate = false;
            commitHydratedContainer(root.containerInfo);
          }
        }
        break;
      }
      case OffscreenComponent:
      case LegacyHiddenComponent: {
        return;
      }
    }

    commitContainer(finishedWork);
    return;
  }

  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: {
      // Layout effects are destroyed during the mutation phase so that all
      // destroy functions for all fibers are called before any create functions.
      // This prevents sibling component effects from interfering with each other,
      // e.g. a destroy function in one component should never override a ref set
      // by a create function in another component during the same commit.
      if (
        enableProfilerTimer &&
        enableProfilerCommitHooks &&
        finishedWork.mode & ProfileMode
      ) {
        try {
          startLayoutEffectTimer();
          commitHookEffectListUnmount(
            HookLayout | HookHasEffect,
            finishedWork,
            finishedWork.return,
          );
        } finally {
          recordLayoutEffectDuration(finishedWork);
        }
      } else {
        commitHookEffectListUnmount(
          HookLayout | HookHasEffect,
          finishedWork,
          finishedWork.return,
        );
      }
      return;
    }
    case ClassComponent: {
      return;
    }
    case HostComponent: {
      const instance: Instance = finishedWork.stateNode;
      if (instance != null) {
        // Commit the work prepared earlier.
        const newProps = finishedWork.memoizedProps;
        // For hydration we reuse the update path but we treat the oldProps
        // as the newProps. The updatePayload will contain the real change in
        // this case.
        const oldProps = current !== null ? current.memoizedProps : newProps;
        const type = finishedWork.type;
        // TODO: Type the updateQueue to be specific to host components.
        const updatePayload: null | UpdatePayload = (finishedWork.updateQueue as any);
        finishedWork.updateQueue = null;
        if (updatePayload !== null) {
          commitUpdate(
            instance,
            updatePayload,
            type,
            oldProps,
            newProps,
            finishedWork,
          );
        }
      }
      return;
    }
    case HostText: {
      invariant(
        finishedWork.stateNode !== null,
        'This should have a text node initialized. This error is likely ' +
          'caused by a bug in React. Please file an issue.',
      );
      const textInstance: TextInstance = finishedWork.stateNode;
      const newText: string = finishedWork.memoizedProps;
      // For hydration we reuse the update path but we treat the oldProps
      // as the newProps. The updatePayload will contain the real change in
      // this case.
      const oldText: string =
        current !== null ? current.memoizedProps : newText;
      commitTextUpdate(textInstance, oldText, newText);
      return;
    }
    case HostRoot: {
      if (supportsHydration) {
        const root: FiberRoot = finishedWork.stateNode;
        if (root.hydrate) {
          // We've just hydrated. No need to hydrate again.
          root.hydrate = false;
          commitHydratedContainer(root.containerInfo);
        }
      }
      return;
    }
    case Profiler: {
      return;
    }
    // case SuspenseComponent: {
    //   commitSuspenseCallback(finishedWork);
    //   attachSuspenseRetryListeners(finishedWork);
    //   return;
    // }
    // case SuspenseListComponent: {
    //   attachSuspenseRetryListeners(finishedWork);
    //   return;
    // }
    case IncompleteClassComponent: {
      return;
    }
    // case ScopeComponent: {
    //   if (enableScopeAPI) {
    //     const scopeInstance = finishedWork.stateNode;
    //     prepareScopeUpdate(scopeInstance, finishedWork);
    //     return;
    //   }
    //   break;
    // }
  }
  invariant(
    false,
    'This unit of work tag should not have side-effects. This error is ' +
      'likely caused by a bug in React. Please file an issue.',
  );
}

function commitContainer(finishedWork: Fiber) {
  if (!supportsPersistence) {
    return;
  }

  // switch (finishedWork.tag) {
  //   case ClassComponent:
  //   case HostComponent:
  //   case HostText: {
  //     return;
  //   }
  //   case HostRoot:
  //   case HostPortal: {
  //     const portalOrRoot: {
  //       containerInfo: Container,
  //       pendingChildren: ChildSet,
  //     } = finishedWork.stateNode;
  //     const {containerInfo, pendingChildren} = portalOrRoot;
  //     replaceContainerChildren(containerInfo, pendingChildren);
  //     return;
  //   }
  // }
  // invariant(
  //   false,
  //   'This unit of work tag should not have side-effects. This error is ' +
  //     'likely caused by a bug in React. Please file an issue.',
  // );
}

function getHostSibling(fiber: Fiber): Element | null | undefined {
  // We're going to search forward into the tree until we find a sibling host
  // node. Unfortunately, if multiple insertions are done in a row we have to
  // search past them. This leads to exponential search for the next sibling.
  // TODO: Find a more efficient way to do this.
  let node: Fiber = fiber;
  siblings: while (true) {
    // If we didn't find anything, let's try the next sibling.
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        // If we pop out of the root or hit the parent the fiber we are the
        // last sibling.
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
    while (
      node.tag !== HostComponent &&
      node.tag !== HostText &&
      node.tag !== DehydratedFragment
    ) {
      // If it is not host node and, we might have a host node inside it.
      // Try to search down until we find one.
      if (node.flags & Placement) {
        // If we don't have a child, try the siblings instead.
        continue siblings;
      }
      // If we don't have a child, try the siblings instead.
      // We also skip portals because they are not part of this host tree.
      if (node.child === null || node.tag === HostPortal) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }
    // Check if this host node is stable or about to be placed.
    if (!(node.flags & Placement)) {
      // Found it!
      return node.stateNode;
    }
  }
}

function insertOrAppendPlacementNodeIntoContainer(
  node: Fiber,
  before: Element | null | undefined,
  parent: Container,
): void {
  const {tag} = node;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const stateNode = node.stateNode;
    if (before) {
      insertInContainerBefore(parent, stateNode, before);
    } else {
      appendChildToContainer(parent, stateNode);
    }
  } else if (tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
  } else {
    const child = node.child;
    if (child !== null) {
      insertOrAppendPlacementNodeIntoContainer(child, before, parent);
      let sibling = child.sibling;
      while (sibling !== null) {
        insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

function insertOrAppendPlacementNode(
  node: Fiber,
  before: Element | null | undefined,
  parent: Instance,
): void {
  const {tag} = node;
  const isHost = tag === HostComponent || tag === HostText;
  if (isHost) {
    const stateNode = node.stateNode;
    if (before) {
      insertBefore(parent, stateNode, before);
    } else {
      appendChild(parent, stateNode);
    }
  } else if (tag === HostPortal) {
    // If the insertion itself is a portal, then we don't want to traverse
    // down its children. Instead, we'll get insertions from each child in
    // the portal directly.
  } else {
    const child = node.child;
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent);
      let sibling = child.sibling;
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}
