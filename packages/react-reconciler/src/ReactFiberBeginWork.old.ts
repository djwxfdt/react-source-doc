import checkPropTypes from "../../shared/checkPropTypes";
import getComponentNameFromType from "../../shared/getComponentNameFromType";
import invariant from "../../shared/invariant";
import { debugRenderPhaseSideEffectsForStrictMode, disableLegacyContext, disableModulePatternComponents, enableCache, enableLazyContextPropagation, enableProfilerTimer, enableSchedulingProfiler, enableSuspenseLayoutEffectSemantics } from "../../shared/ReactFeatureFlags";
import { createFiberFromTypeAndProps } from "./ReactFiber.old";
import { ChildDeletion, ContentReset, DidCapture, ForceUpdateForLegacySuspense, Hydrating, NoFlags, PerformedWork, Placement, Ref, RefStatic } from "./ReactFiberFlags";
import { includesSomeLane, Lanes, NoLanes } from "./ReactFiberLane.old";
import { Fiber, FiberRoot } from "./ReactInternalTypes";
import { IndeterminateComponent, LazyComponent, FunctionComponent, ClassComponent, HostRoot, HostComponent, HostText, SuspenseComponent, HostPortal, ForwardRef, Fragment, Mode, Profiler, ContextProvider, ContextConsumer, MemoComponent, SimpleMemoComponent, IncompleteClassComponent, SuspenseListComponent, ScopeComponent, OffscreenComponent, LegacyHiddenComponent, CacheComponent } from "./ReactWorkTags";

import {
  getMaskedContext,
  getUnmaskedContext,
  hasContextChanged as hasLegacyContextChanged,
  pushContextProvider as pushLegacyContextProvider,
  isContextProvider as isLegacyContextProvider,
  pushTopLevelContextObject,
} from './ReactFiberContext.old';
import { checkIfContextChanged, prepareToReadContext, propagateContextChange, readContext } from "./ReactFiberNewContext.old";
import { markComponentRenderStarted, markComponentRenderStopped } from "./SchedulingProfiler";
import ReactSharedInternals from "../../shared/ReactSharedInternals";
import { setIsRendering } from "./ReactCurrentFiber";
import { bailoutHooks, renderWithHooks } from "./ReactFiberHooks.old";
import { ReactStrictModeWarnings } from "./ReactStrictModeWarnings.old";
import { StrictLegacyMode } from "./ReactTypeOfMode";
import { disableLogs, reenableLogs } from "../../shared/ConsolePatchingDev";
import { cloneUpdateQueue, initializeUpdateQueue, processUpdateQueue } from "./ReactUpdateQueue.old";
import { adoptClassInstance, mountClassInstance } from "./ReactFiberClassComponent.old";
import { cloneChildFibers, mountChildFibers, reconcileChildFibers } from "./ReactChildFiber.old";
import { pushHostContainer, pushHostContext } from "./ReactFiberHostContext.old";
import { pushCacheProvider, Cache, pushRootCachePool, CacheContext } from "./ReactFiberCacheComponent.old";
import { enterHydrationState, resetHydrationState, tryToClaimNextHydratableInstance } from "./ReactFiberHydrationContext.old";
import { markSkippedUpdateLanes } from "./ReactFiberWorkLoop.old";
import { isPrimaryRenderer, shouldSetTextContent, supportsHydration } from "./ReactFiberHostConfig";
import { MutableSource, ReactContext, ReactProviderType } from "../../shared/ReactTypes";
import { setWorkInProgressVersion } from "./ReactMutableSource.old";
import { resolveDefaultProps } from "./ReactFiberLazyComponent.old";
import objectIs from "../../shared/objectIs";
import { createCursor, push, StackCursor } from "./ReactFiberStack.old";

const ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;

const valueCursor: StackCursor<mixed> = createCursor(null);

let rendererSigil: any;
if (__DEV__) {
  // Use this to detect multiple renderers using the same context
  rendererSigil = {};
}

let didReceiveUpdate = false;

let didWarnAboutBadClass: any;
let didWarnAboutModulePatternComponent: any;
let didWarnAboutContextTypeOnFunctionComponent;
let didWarnAboutGetDerivedStateOnFunctionComponent;
let didWarnAboutFunctionRefs;
export let didWarnAboutReassigningProps: any;
let didWarnAboutRevealOrder;
let didWarnAboutTailOptions;
let didWarnAboutDefaultPropsOnFunctionComponent;

if (__DEV__) {
  didWarnAboutBadClass = {};
  didWarnAboutModulePatternComponent = {};
  didWarnAboutContextTypeOnFunctionComponent = {};
  didWarnAboutGetDerivedStateOnFunctionComponent = {};
  didWarnAboutFunctionRefs = {};
  didWarnAboutReassigningProps = false;
  didWarnAboutRevealOrder = {};
  didWarnAboutTailOptions = {};
  didWarnAboutDefaultPropsOnFunctionComponent = {};
}


/**
 * ??????fiber?????????????????????child???????????????clone?????????fiber???child????????????child
 */
function bailoutOnAlreadyFinishedWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  if (current !== null) {
    // Reuse previous dependencies
    workInProgress.dependencies = current.dependencies;
  }

  // if (enableProfilerTimer) {
  //   // Don't update "base" render times for bailouts.
  //   stopProfilerTimerIfRunning(workInProgress);
  // }

  markSkippedUpdateLanes(workInProgress.lanes);

  // Check if the children have any pending work.
  if (!includesSomeLane(renderLanes, workInProgress.childLanes)) {
    // The children don't have any work either. We can skip them.
    // TODO: Once we add back resuming, we should check if the children are
    // a work-in-progress set. If so, we need to transfer their effects.

    if (enableLazyContextPropagation && current !== null) {
      // Before bailing out, check if there are any context changes in
      // the children.
      // lazilyPropagateParentContextChanges(current, workInProgress, renderLanes);
      if (!includesSomeLane(renderLanes, workInProgress.childLanes)) {
        return null;
      }
    } else {
      return null;
    }
  }

  // // This fiber doesn't have work, but its subtree does. Clone the child
  // // fibers and continue.
  cloneChildFibers(current, workInProgress);
  return workInProgress.child;
}

/**
 * ??????????????????
 * 
 * ???fiber?????????????????????fiber???????????????fiber????????????????????????????????????????????????????????????
 */
function remountFiber(
  current: Fiber,
  oldWorkInProgress: Fiber,
  newWorkInProgress: Fiber,
): Fiber | null {
  if (__DEV__) {
    const returnFiber = oldWorkInProgress.return;
    if (returnFiber === null) {
      throw new Error('Cannot swap the root fiber.');
    }

    // Disconnect from the old current.
    // It will get deleted.
    current.alternate = null;
    oldWorkInProgress.alternate = null;

    // Connect to the new tree.
    newWorkInProgress.index = oldWorkInProgress.index;
    newWorkInProgress.sibling = oldWorkInProgress.sibling;
    newWorkInProgress.return = oldWorkInProgress.return;
    newWorkInProgress.ref = oldWorkInProgress.ref;

    // Replace the child/sibling pointers above it.
    if (oldWorkInProgress === returnFiber.child) {
      returnFiber.child = newWorkInProgress;
    } else {
      let prevSibling = returnFiber.child;
      if (prevSibling === null) {
        throw new Error('Expected parent to have a child.');
      }
      while (prevSibling.sibling !== oldWorkInProgress) {
        prevSibling = prevSibling.sibling;
        if (prevSibling === null) {
          throw new Error('Expected to find the previous sibling.');
        }
      }
      prevSibling.sibling = newWorkInProgress;
    }

    // Delete the old fiber and place the new one.
    // Since the old fiber is disconnected, we have to schedule it manually.
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [current];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(current);
    }

    newWorkInProgress.flags |= Placement;

    // Restart work from the new fiber.
    return newWorkInProgress;
  } else {
    throw new Error(
      'Did not expect this call in production. ' +
        'This is a bug in React. Please file an issue.',
    );
  }
}

/**
 * TODO,????????????
 */
function checkScheduledUpdateOrContext(
  current: Fiber,
  renderLanes: Lanes,
): boolean {
  // Before performing an early bailout, we must check if there are pending
  // updates or context.
  const updateLanes = current.lanes;
  if (includesSomeLane(updateLanes, renderLanes)) {
    return true;
  }
  // No pending update, but because context is propagated lazily, we need
  // to check for a context change before we bail out.
  if (enableLazyContextPropagation) {
    const dependencies = current.dependencies;
    if (dependencies !== null && checkIfContextChanged(dependencies)) {
      return true;
    }
  }
  return false;
}

function pushHostRootContext(workInProgress: Fiber) {
  const root = (workInProgress.stateNode as  FiberRoot);
  if (root.pendingContext) {
    pushTopLevelContextObject(
      workInProgress,
      root.pendingContext,
      root.pendingContext !== root.context,
    );
  } else if (root.context) {
    // Should always be set
    pushTopLevelContextObject(workInProgress, root.context, false);
  }
  pushHostContainer(workInProgress, root.containerInfo);
}

/**
 * ??????fiber???????????????????????????child??????
 */
function attemptEarlyBailoutIfNoScheduledUpdate(
  current: Fiber,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  // This fiber does not have any pending work. Bailout without entering
  // the begin phase. There's still some bookkeeping we that needs to be done
  // in this optimized path, mostly pushing stuff onto the stack.
  switch (workInProgress.tag) {
    case HostRoot:
      pushHostRootContext(workInProgress);
      if (enableCache) {
        const root: FiberRoot = workInProgress.stateNode;
        const cache: Cache = current.memoizedState.cache;
        pushCacheProvider(workInProgress, cache);
        pushRootCachePool(root);
      }
      resetHydrationState();
      break;
    case HostComponent:
      pushHostContext(workInProgress);
      break;
  //   case ClassComponent: {
  //     const Component = workInProgress.type;
  //     if (isLegacyContextProvider(Component)) {
  //       pushLegacyContextProvider(workInProgress);
  //     }
  //     break;
  //   }
  //   case HostPortal:
  //     pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
  //     break;
  //   case ContextProvider: {
  //     const newValue = workInProgress.memoizedProps.value;
  //     const context: ReactContext<any> = workInProgress.type._context;
  //     pushProvider(workInProgress, context, newValue);
  //     break;
  //   }
  //   case Profiler:
  //     if (enableProfilerTimer) {
  //       // Profiler should only call onRender when one of its descendants actually rendered.
  //       const hasChildWork = includesSomeLane(
  //         renderLanes,
  //         workInProgress.childLanes,
  //       );
  //       if (hasChildWork) {
  //         workInProgress.flags |= Update;
  //       }

  //       if (enableProfilerCommitHooks) {
  //         // Reset effect durations for the next eventual effect phase.
  //         // These are reset during render to allow the DevTools commit hook a chance to read them,
  //         const stateNode = workInProgress.stateNode;
  //         stateNode.effectDuration = 0;
  //         stateNode.passiveEffectDuration = 0;
  //       }
  //     }
  //     break;
  //   case SuspenseComponent: {
  //     const state: SuspenseState | null = workInProgress.memoizedState;
  //     if (state !== null) {
  //       if (enableSuspenseServerRenderer) {
  //         if (state.dehydrated !== null) {
  //           pushSuspenseContext(
  //             workInProgress,
  //             setDefaultShallowSuspenseContext(suspenseStackCursor.current),
  //           );
  //           // We know that this component will suspend again because if it has
  //           // been unsuspended it has committed as a resolved Suspense component.
  //           // If it needs to be retried, it should have work scheduled on it.
  //           workInProgress.flags |= DidCapture;
  //           // We should never render the children of a dehydrated boundary until we
  //           // upgrade it. We return null instead of bailoutOnAlreadyFinishedWork.
  //           return null;
  //         }
  //       }

  //       // If this boundary is currently timed out, we need to decide
  //       // whether to retry the primary children, or to skip over it and
  //       // go straight to the fallback. Check the priority of the primary
  //       // child fragment.
  //       const primaryChildFragment: Fiber = (workInProgress.child: any);
  //       const primaryChildLanes = primaryChildFragment.childLanes;
  //       if (includesSomeLane(renderLanes, primaryChildLanes)) {
  //         // The primary children have pending work. Use the normal path
  //         // to attempt to render the primary children again.
  //         return updateSuspenseComponent(current, workInProgress, renderLanes);
  //       } else {
  //         // The primary child fragment does not have pending work marked
  //         // on it
  //         pushSuspenseContext(
  //           workInProgress,
  //           setDefaultShallowSuspenseContext(suspenseStackCursor.current),
  //         );
  //         // The primary children do not have pending work with sufficient
  //         // priority. Bailout.
  //         const child = bailoutOnAlreadyFinishedWork(
  //           current,
  //           workInProgress,
  //           renderLanes,
  //         );
  //         if (child !== null) {
  //           // The fallback children have pending work. Skip over the
  //           // primary children and work on the fallback.
  //           return child.sibling;
  //         } else {
  //           // Note: We can return `null` here because we already checked
  //           // whether there were nested context consumers, via the call to
  //           // `bailoutOnAlreadyFinishedWork` above.
  //           return null;
  //         }
  //       }
  //     } else {
  //       pushSuspenseContext(
  //         workInProgress,
  //         setDefaultShallowSuspenseContext(suspenseStackCursor.current),
  //       );
  //     }
  //     break;
  //   }
  //   case SuspenseListComponent: {
  //     const didSuspendBefore = (current.flags & DidCapture) !== NoFlags;

  //     let hasChildWork = includesSomeLane(
  //       renderLanes,
  //       workInProgress.childLanes,
  //     );

  //     if (enableLazyContextPropagation && !hasChildWork) {
  //       // Context changes may not have been propagated yet. We need to do
  //       // that now, before we can decide whether to bail out.
  //       // TODO: We use `childLanes` as a heuristic for whether there is
  //       // remaining work in a few places, including
  //       // `bailoutOnAlreadyFinishedWork` and
  //       // `updateDehydratedSuspenseComponent`. We should maybe extract this
  //       // into a dedicated function.
  //       lazilyPropagateParentContextChanges(
  //         current,
  //         workInProgress,
  //         renderLanes,
  //       );
  //       hasChildWork = includesSomeLane(renderLanes, workInProgress.childLanes);
  //     }

  //     if (didSuspendBefore) {
  //       if (hasChildWork) {
  //         // If something was in fallback state last time, and we have all the
  //         // same children then we're still in progressive loading state.
  //         // Something might get unblocked by state updates or retries in the
  //         // tree which will affect the tail. So we need to use the normal
  //         // path to compute the correct tail.
  //         return updateSuspenseListComponent(
  //           current,
  //           workInProgress,
  //           renderLanes,
  //         );
  //       }
  //       // If none of the children had any work, that means that none of
  //       // them got retried so they'll still be blocked in the same way
  //       // as before. We can fast bail out.
  //       workInProgress.flags |= DidCapture;
  //     }

  //     // If nothing suspended before and we're rendering the same children,
  //     // then the tail doesn't matter. Anything new that suspends will work
  //     // in the "together" mode, so we can continue from the state we had.
  //     const renderState = workInProgress.memoizedState;
  //     if (renderState !== null) {
  //       // Reset to the "together" mode in case we've started a different
  //       // update in the past but didn't complete it.
  //       renderState.rendering = null;
  //       renderState.tail = null;
  //       renderState.lastEffect = null;
  //     }
  //     pushSuspenseContext(workInProgress, suspenseStackCursor.current);

  //     if (hasChildWork) {
  //       break;
  //     } else {
  //       // If none of the children had any work, that means that none of
  //       // them got retried so they'll still be blocked in the same way
  //       // as before. We can fast bail out.
  //       return null;
  //     }
  //   }
  //   case OffscreenComponent:
  //   case LegacyHiddenComponent: {
  //     // Need to check if the tree still needs to be deferred. This is
  //     // almost identical to the logic used in the normal update path,
  //     // so we'll just enter that. The only difference is we'll bail out
  //     // at the next level instead of this one, because the child props
  //     // have not changed. Which is fine.
  //     // TODO: Probably should refactor `beginWork` to split the bailout
  //     // path from the normal path. I'm tempted to do a labeled break here
  //     // but I won't :)
  //     workInProgress.lanes = NoLanes;
  //     return updateOffscreenComponent(current, workInProgress, renderLanes);
  //   }
  //   case CacheComponent: {
  //     if (enableCache) {
  //       const cache: Cache = current.memoizedState.cache;
  //       pushCacheProvider(workInProgress, cache);
  //     }
  //     break;
  //   }
  }
  return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
}

function finishClassComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  shouldUpdate: boolean,
  hasContext: boolean,
  renderLanes: Lanes,
) {
  // Refs should update even if shouldComponentUpdate returns false
  return workInProgress.child;
}

/**
 * ??????????????????????????????
 * 
 * ????????????????????????????????????fiber??? ???????????????????????????diff??????
 * 
 * ????????????current?????????null
 */
export function reconcileChildren(
  current: Fiber | null,
  workInProgress: Fiber,
  nextChildren: any,
  renderLanes: Lanes,
) {
  if (current === null) {
    // If this is a fresh new component that hasn't been rendered yet, we
    // won't update its child set by applying minimal side-effects. Instead,
    // we will add them all to the child before it gets rendered. That means
    // we can optimize this reconciliation pass by not tracking side-effects.
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes,
    );
  } else {
    // If the current child is the same as the work in progress, it means that
    // we haven't yet started any work on these children. Therefore, we use
    // the clone algorithm to create a copy of all the current children.

    // If we had any progressed work already, that is invalid at this point so
    // let's throw it out.
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes,
    );
  }
}

/**
 * ????????????????????????function??????????????????class????????????function?????????????????????function???
 * 
 * react???????????????????????????????????????????????????????????????????????????????????????????????????
 * 
 * ?????????????????????????????????mount????????? update???????????????????????????
 */
function mountIndeterminateComponent(
  _current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  renderLanes: Lanes,
) {
  if (_current !== null) {
    // An indeterminate component only mounts if it suspended inside a non-
    // concurrent tree, in an inconsistent state. We want to treat it like
    // a new mount, even though an empty version of it already committed.
    // Disconnect the alternate pointers.
    _current.alternate = null;
    workInProgress.alternate = null;
    // Since this is conceptually a new fiber, schedule a Placement effect
    workInProgress.flags |= Placement;
  }
  const props = workInProgress.pendingProps;
  let context;
  if (!disableLegacyContext) {
    const unmaskedContext = getUnmaskedContext(
      workInProgress,
      Component,
      false,
    );
    /**
     * ???????????????????????????????????????
     */
    context = getMaskedContext(workInProgress, unmaskedContext);
  }

  prepareToReadContext(workInProgress, renderLanes);
  let value;

  if (enableSchedulingProfiler) {
    markComponentRenderStarted(workInProgress);
  }

  if (__DEV__) {
    if (
      Component.prototype &&
      typeof Component.prototype.render === 'function'
    ) {
      const componentName = getComponentNameFromType(Component) || 'Unknown';

      if (!didWarnAboutBadClass[componentName]) {
        console.error(
          "The <%s /> component appears to have a render method, but doesn't extend React.Component. " +
            'This is likely to cause errors. Change %s to extend React.Component instead.',
          componentName,
          componentName,
        );
        didWarnAboutBadClass[componentName] = true;
      }
    }

    if (workInProgress.mode & StrictLegacyMode) {
      ReactStrictModeWarnings.recordLegacyContextWarning(workInProgress, null);
    }

    setIsRendering(true);
    ReactCurrentOwner.current = workInProgress;
    value = renderWithHooks(
      null,
      workInProgress,
      Component,
      props,
      context,
      renderLanes,
    );
    setIsRendering(false);
  } else {
    value = renderWithHooks(
      null,
      workInProgress,
      Component,
      props,
      context,
      renderLanes,
    );
  }

  if (enableSchedulingProfiler) {
    markComponentRenderStopped();
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;

  if (__DEV__) {
    // Support for module components is deprecated and is removed behind a flag.
    // Whether or not it would crash later, we want to show a good message in DEV first.
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof value.render === 'function' &&
      value.$$typeof === undefined
    ) {
      const componentName = getComponentNameFromType(Component) || 'Unknown';
      if (!didWarnAboutModulePatternComponent[componentName]) {
        console.error(
          'The <%s /> component appears to be a function component that returns a class instance. ' +
            'Change %s to a class that extends React.Component instead. ' +
            "If you can't use a class try assigning the prototype on the function as a workaround. " +
            "`%s.prototype = React.Component.prototype`. Don't use an arrow function since it " +
            'cannot be called with `new` by React.',
          componentName,
          componentName,
          componentName,
        );
        didWarnAboutModulePatternComponent[componentName] = true;
      }
    }
  }


  /**
   * ?????????????????????????????????????????????????????????{render: () => {}}???????????????
   */
  if (
    // Run these checks in production only if the flag is off.
    // Eventually we'll delete this branch altogether.
    !disableModulePatternComponents &&
    typeof value === 'object' &&
    value !== null &&
    typeof value.render === 'function' &&
    value.$$typeof === undefined
  ) {
    if (__DEV__) {
      const componentName = getComponentNameFromType(Component) || 'Unknown';
      if (!didWarnAboutModulePatternComponent[componentName]) {
        console.error(
          'The <%s /> component appears to be a function component that returns a class instance. ' +
            'Change %s to a class that extends React.Component instead. ' +
            "If you can't use a class try assigning the prototype on the function as a workaround. " +
            "`%s.prototype = React.Component.prototype`. Don't use an arrow function since it " +
            'cannot be called with `new` by React.',
          componentName,
          componentName,
          componentName,
        );
        didWarnAboutModulePatternComponent[componentName] = true;
      }
    }

    // Proceed under the assumption that this is a class instance
    workInProgress.tag = ClassComponent;

    // Throw out any hooks that were used.
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;

    // Push context providers early to prevent context stack mismatches.
    // During mounting we don't know the child context yet as the instance doesn't exist.
    // We will invalidate the child context in finishClassComponent() right after rendering.
    let hasContext = false;
    if (isLegacyContextProvider(Component)) {
      hasContext = true;
      pushLegacyContextProvider(workInProgress);
    } else {
      hasContext = false;
    }

    workInProgress.memoizedState =
      value.state !== null && value.state !== undefined ? value.state : null;

    initializeUpdateQueue(workInProgress);

    adoptClassInstance(workInProgress, value);
    mountClassInstance(workInProgress, Component, props, renderLanes);
    return finishClassComponent(
      null,
      workInProgress,
      Component,
      true,
      hasContext,
      renderLanes,
    );
  } else {
    // Proceed under the assumption that this is a function component
    workInProgress.tag = FunctionComponent;
    if (__DEV__) {
      if (disableLegacyContext && Component.contextTypes) {
        console.error(
          '%s uses the legacy contextTypes API which is no longer supported. ' +
            'Use React.createContext() with React.useContext() instead.',
          getComponentNameFromType(Component) || 'Unknown',
        );
      }

      if (
        debugRenderPhaseSideEffectsForStrictMode &&
        workInProgress.mode & StrictLegacyMode
      ) {
        disableLogs();
        try {
          value = renderWithHooks(
            null,
            workInProgress,
            Component,
            props,
            context,
            renderLanes,
          );
        } finally {
          reenableLogs();
        }
      }
    }
    reconcileChildren(null, workInProgress, value, renderLanes);
    if (__DEV__) {
      validateFunctionComponentInDev(workInProgress, Component);
    }
    return workInProgress.child;
  }
}

/**
 * ?????????????????????
 */
export function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null  {
  if (__DEV__) {
    if (workInProgress._debugNeedsRemount && current !== null) {
      // This will restart the begin phase with a new fiber.
      return remountFiber(
        current,
        workInProgress,
        createFiberFromTypeAndProps(
          workInProgress.type,
          workInProgress.key,
          workInProgress.pendingProps,
          workInProgress._debugOwner || null,
          workInProgress.mode,
          workInProgress.lanes,
        ),
      );
    }
  }

  /**
   * ????????????bailout?????????react?????????????????????render?????????????????????component?????????????????????render,??????????????????bailout
   */

  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;

    if (
      oldProps !== newProps ||
      hasLegacyContextChanged() ||
      // Force a re-render if the implementation changed due to hot reload:
      (__DEV__ ? workInProgress.type !== current.type : false)
    ) {
      // If props or context changed, mark the fiber as having performed work.
      // This may be unset if the props are determined to be equal later (memo).
      /**
       * ??????props?????????????????????context????????????????????????????????????,?????????????????????????????????????????????????????????
       */
      didReceiveUpdate = true;
    } else {
      // Neither props nor legacy context changes. Check if there's a pending
      // update or context change.
      const hasScheduledUpdateOrContext = checkScheduledUpdateOrContext(
        current,
        renderLanes,
      );
      if (
        !hasScheduledUpdateOrContext &&
        // If this is the second pass of an error or suspense boundary, there
        // may not be work scheduled on `current`, so we check for this flag.
        (workInProgress.flags & DidCapture) === NoFlags
      ) {
        // No pending updates or context. Bail out now.
        didReceiveUpdate = false;
        return attemptEarlyBailoutIfNoScheduledUpdate(
          current,
          workInProgress,
          renderLanes,
        );
      }
      if ((current.flags & ForceUpdateForLegacySuspense) !== NoFlags) {
        // This is a special case that only exists for legacy mode.
        // See https://github.com/facebook/react/pull/19216.
        didReceiveUpdate = true;
      } else {
        // An update was scheduled on this fiber, but there are no new props
        // nor legacy context. Set this to false. If an update queue or context
        // consumer produces a changed value, it will set this to true. Otherwise,
        // the component will assume the children have not changed and bail out.
        didReceiveUpdate = false;
      }
    }
  } else {
    didReceiveUpdate = false;
  }

  // Before entering the begin phase, clear pending update priority.
  // TODO: This assumes that we're about to evaluate the component and process
  // the update queue. However, there's an exception: SimpleMemoComponent
  // sometimes bails out later in the begin phase. This indicates that we should
  // move this assignment out of the common path and into each branch.
  workInProgress.lanes = NoLanes;


  switch (workInProgress.tag) {
    case IndeterminateComponent: {
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
        renderLanes,
      );
    }
    // case LazyComponent: {
    //   const elementType = workInProgress.elementType;
    //   return mountLazyComponent(
    //     current,
    //     workInProgress,
    //     elementType,
    //     renderLanes,
    //   );
    // }
    case FunctionComponent: {
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps =
        workInProgress.elementType === Component
          ? unresolvedProps
          : resolveDefaultProps(Component, unresolvedProps);
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes,
      );
    }
    // case ClassComponent: {
    //   const Component = workInProgress.type;
    //   const unresolvedProps = workInProgress.pendingProps;
    //   const resolvedProps =
    //     workInProgress.elementType === Component
    //       ? unresolvedProps
    //       : resolveDefaultProps(Component, unresolvedProps);
    //   return updateClassComponent(
    //     current,
    //     workInProgress,
    //     Component,
    //     resolvedProps,
    //     renderLanes,
    //   );
    // }
    case HostRoot:
      return updateHostRoot(current!, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
    // case SuspenseComponent:
    //   return updateSuspenseComponent(current, workInProgress, renderLanes);
    // case HostPortal:
    //   return updatePortalComponent(current, workInProgress, renderLanes);
    // case ForwardRef: {
    //   const type = workInProgress.type;
    //   const unresolvedProps = workInProgress.pendingProps;
    //   const resolvedProps =
    //     workInProgress.elementType === type
    //       ? unresolvedProps
    //       : resolveDefaultProps(type, unresolvedProps);
    //   return updateForwardRef(
    //     current,
    //     workInProgress,
    //     type,
    //     resolvedProps,
    //     renderLanes,
    //   );
    // }
    // case Fragment:
    //   return updateFragment(current, workInProgress, renderLanes);
    // case Mode:
    //   return updateMode(current, workInProgress, renderLanes);
    // case Profiler:
    //   return updateProfiler(current, workInProgress, renderLanes);
    case ContextProvider:
      return updateContextProvider(current, workInProgress, renderLanes);
    case ContextConsumer:
      return updateContextConsumer(current, workInProgress, renderLanes);
    // case MemoComponent: {
    //   const type = workInProgress.type;
    //   const unresolvedProps = workInProgress.pendingProps;
    //   // Resolve outer props first, then resolve inner props.
    //   let resolvedProps = resolveDefaultProps(type, unresolvedProps);
    //   if (__DEV__) {
    //     if (workInProgress.type !== workInProgress.elementType) {
    //       const outerPropTypes = type.propTypes;
    //       if (outerPropTypes) {
    //         checkPropTypes(
    //           outerPropTypes,
    //           resolvedProps, // Resolved for outer only
    //           'prop',
    //           getComponentNameFromType(type),
    //         );
    //       }
    //     }
    //   }
    //   resolvedProps = resolveDefaultProps(type.type, resolvedProps);
    //   return updateMemoComponent(
    //     current,
    //     workInProgress,
    //     type,
    //     resolvedProps,
    //     renderLanes,
    //   );
    // }
    // case SimpleMemoComponent: {
    //   return updateSimpleMemoComponent(
    //     current,
    //     workInProgress,
    //     workInProgress.type,
    //     workInProgress.pendingProps,
    //     renderLanes,
    //   );
    // }
    // case IncompleteClassComponent: {
    //   const Component = workInProgress.type;
    //   const unresolvedProps = workInProgress.pendingProps;
    //   const resolvedProps =
    //     workInProgress.elementType === Component
    //       ? unresolvedProps
    //       : resolveDefaultProps(Component, unresolvedProps);
    //   return mountIncompleteClassComponent(
    //     current,
    //     workInProgress,
    //     Component,
    //     resolvedProps,
    //     renderLanes,
    //   );
    // }
    // case SuspenseListComponent: {
    //   return updateSuspenseListComponent(current, workInProgress, renderLanes);
    // }
    // case ScopeComponent: {
    //   if (enableScopeAPI) {
    //     return updateScopeComponent(current, workInProgress, renderLanes);
    //   }
    //   break;
    // }
    // case OffscreenComponent: {
    //   return updateOffscreenComponent(current, workInProgress, renderLanes);
    // }
    // case LegacyHiddenComponent: {
    //   return updateLegacyHiddenComponent(current, workInProgress, renderLanes);
    // }
    // case CacheComponent: {
    //   if (enableCache) {
    //     return updateCacheComponent(current, workInProgress, renderLanes);
    //   }
    //   break;
    // }
  }
  invariant(
    false,
    'Unknown unit of work tag (%s). This error is likely caused by a bug in ' +
      'React. Please file an issue.',
    workInProgress.tag,
  );
  return null
}


export function markWorkInProgressReceivedUpdate() {
  didReceiveUpdate = true;
}

export function checkIfWorkInProgressReceivedUpdate() {
  return didReceiveUpdate;
}


function validateFunctionComponentInDev(workInProgress: Fiber, Component: any) {
  
}

function updateHostRoot(current: Fiber, workInProgress: Fiber, renderLanes: Lanes) {
  pushHostRootContext(workInProgress);
  const updateQueue = workInProgress.updateQueue;
  invariant(
    current !== null && updateQueue !== null,
    'If the root does not have an updateQueue, we should have already ' +
      'bailed out. This error is likely caused by a bug in React. Please ' +
      'file an issue.',
  );
  const nextProps = workInProgress.pendingProps;
  const prevState = workInProgress.memoizedState;
  const prevChildren = prevState.element;
  cloneUpdateQueue(current, workInProgress);
  processUpdateQueue(workInProgress, nextProps, null, renderLanes);
  const nextState = workInProgress.memoizedState;

  const root: FiberRoot = workInProgress.stateNode;

  if (enableCache) {
    const nextCache: Cache = nextState.cache;
    pushRootCachePool(root);
    pushCacheProvider(workInProgress, nextCache);
    if (nextCache !== prevState.cache) {
      // The root cache refreshed.
      propagateContextChange(workInProgress, CacheContext, renderLanes);
    }
  }

  // Caution: React DevTools currently depends on this property
  // being called "element".
  const nextChildren = nextState.element;
  if (nextChildren === prevChildren) {
    resetHydrationState();
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  if (root.hydrate && enterHydrationState(workInProgress)) {
    // If we don't have any current children this might be the first pass.
    // We always try to hydrate. If this isn't a hydration pass there won't
    // be any children to hydrate which is effectively the same thing as
    // not hydrating.

    if (supportsHydration) {
      const mutableSourceEagerHydrationData =
        root.mutableSourceEagerHydrationData;
      if (mutableSourceEagerHydrationData != null) {
        for (let i = 0; i < mutableSourceEagerHydrationData.length; i += 2) {
          const mutableSource = ((mutableSourceEagerHydrationData[
            i
          ] as any) as MutableSource<any>);
          const version = mutableSourceEagerHydrationData[i + 1];
          setWorkInProgressVersion(mutableSource, version);
        }
      }
    }

    const child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes,
    );
    workInProgress.child = child;

    let node = child;
    while (node) {
      // Mark each child as hydrating. This is a fast path to know whether this
      // tree is part of a hydrating tree. This is used to determine if a child
      // node has fully mounted yet, and for scheduling event replaying.
      // Conceptually this is similar to Placement in that a new subtree is
      // inserted into the React tree here. It just happens to not need DOM
      // mutations because it already exists.
      node.flags = (node.flags & ~Placement) | Hydrating;
      node = node.sibling;
    }
  } else {
    // Otherwise reset hydration state in case we aborted and resumed another
    // root.
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
    resetHydrationState();
  }
  return workInProgress.child;
}

function markRef(current: Fiber | null, workInProgress: Fiber) {
  const ref = workInProgress.ref;
  if (
    (current === null && ref !== null) ||
    (current !== null && current.ref !== ref)
  ) {
    // Schedule a Ref effect
    workInProgress.flags |= Ref;
    if (enableSuspenseLayoutEffectSemantics) {
      workInProgress.flags |= RefStatic;
    }
  }
}

function updateHostComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  pushHostContext(workInProgress);

  if (current === null) {
    tryToClaimNextHydratableInstance(workInProgress);
  }

  const type = workInProgress.type;
  const nextProps = workInProgress.pendingProps;
  const prevProps = current !== null ? current.memoizedProps : null;

  let nextChildren = nextProps.children;
  const isDirectTextChild = shouldSetTextContent(type, nextProps);

  if (isDirectTextChild) {
    // We special case a direct text child of a host node. This is a common
    // case. We won't handle it as a reified child. We will instead handle
    // this in the host environment that also has access to this prop. That
    // avoids allocating another HostText fiber and traversing it.
    nextChildren = null;
  } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
    // If we're switching from a direct text child to a normal child, or to
    // empty, we need to schedule the text content to be reset.
    workInProgress.flags |= ContentReset;
  }

  markRef(current, workInProgress);
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateFunctionComponent(
  current: any,
  workInProgress: Fiber,
  Component: any,
  nextProps: any,
  renderLanes: number,
) {
  if (__DEV__) {
    if (workInProgress.type !== workInProgress.elementType) {
      // Lazy component props can't be validated in createElement
      // because they're only guaranteed to be resolved here.
      const innerPropTypes = Component.propTypes;
      if (innerPropTypes) {
        checkPropTypes(
          innerPropTypes,
          nextProps, // Resolved props
          'prop',
          getComponentNameFromType(Component) as any,
        );
      }
    }
  }

  let context;
  if (!disableLegacyContext) {
    const unmaskedContext = getUnmaskedContext(workInProgress, Component, true);
    context = getMaskedContext(workInProgress, unmaskedContext);
  }

  let nextChildren;
  prepareToReadContext(workInProgress, renderLanes);
  if (enableSchedulingProfiler) {
    markComponentRenderStarted(workInProgress);
  }
  if (__DEV__) {
    ReactCurrentOwner.current = workInProgress;
    setIsRendering(true);
    nextChildren = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      context,
      renderLanes,
    );
    if (
      debugRenderPhaseSideEffectsForStrictMode &&
      workInProgress.mode & StrictLegacyMode
    ) {
      disableLogs();
      try {
        nextChildren = renderWithHooks(
          current,
          workInProgress,
          Component,
          nextProps,
          context,
          renderLanes,
        );
      } finally {
        reenableLogs();
      }
    }
    setIsRendering(false);
  } else {
    nextChildren = renderWithHooks(
      current,
      workInProgress,
      Component,
      nextProps,
      context,
      renderLanes,
    );
  }
  if (enableSchedulingProfiler) {
    markComponentRenderStopped();
  }

  if (current !== null && !didReceiveUpdate) {
    bailoutHooks(current, workInProgress, renderLanes);
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostText(current: any, workInProgress: any) {
  if (current === null) {
    tryToClaimNextHydratableInstance(workInProgress);
  }
  // Nothing to do here. This is terminal. We'll do the completion step
  // immediately after.
  return null;
}

export function pushProvider<T>(
  providerFiber: Fiber,
  context: ReactContext<T>,
  nextValue: T,
): void {
  if (isPrimaryRenderer) {
    push(valueCursor, context._currentValue, providerFiber);

    context._currentValue = nextValue;
    if (__DEV__) {
      if (
        context._currentRenderer !== undefined &&
        context._currentRenderer !== null &&
        context._currentRenderer !== rendererSigil
      ) {
        console.error(
          'Detected multiple renderers concurrently rendering the ' +
            'same context provider. This is currently unsupported.',
        );
      }
      context._currentRenderer = rendererSigil;
    }
  } else {
    push(valueCursor, context._currentValue2, providerFiber);

    context._currentValue2 = nextValue;
    if (__DEV__) {
      if (
        context._currentRenderer2 !== undefined &&
        context._currentRenderer2 !== null &&
        context._currentRenderer2 !== rendererSigil
      ) {
        console.error(
          'Detected multiple renderers concurrently rendering the ' +
            'same context provider. This is currently unsupported.',
        );
      }
      context._currentRenderer2 = rendererSigil;
    }
  }
}

let hasWarnedAboutUsingNoValuePropOnContextProvider = false;

function updateContextProvider(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  const providerType: ReactProviderType<any> = workInProgress.type;
  const context: ReactContext<any> = providerType._context;

  const newProps = workInProgress.pendingProps;
  const oldProps = workInProgress.memoizedProps;

  const newValue = newProps.value;

  if (__DEV__) {
    if (!('value' in newProps)) {
      if (!hasWarnedAboutUsingNoValuePropOnContextProvider) {
        hasWarnedAboutUsingNoValuePropOnContextProvider = true;
        console.error(
          'The `value` prop is required for the `<Context.Provider>`. Did you misspell it or forget to pass it?',
        );
      }
    }
    const providerPropTypes = workInProgress.type.propTypes;

    if (providerPropTypes) {
      checkPropTypes(providerPropTypes, newProps, 'prop', 'Context.Provider');
    }
  }

  pushProvider(workInProgress, context, newValue);

  if (enableLazyContextPropagation) {
    // In the lazy propagation implementation, we don't scan for matching
    // consumers until something bails out, because until something bails out
    // we're going to visit those nodes, anyway. The trade-off is that it shifts
    // responsibility to the consumer to track whether something has changed.
  } else {
    if (oldProps !== null) {
      const oldValue = oldProps.value;
      if (objectIs(oldValue, newValue)) {
        // No change. Bailout early if children are the same.
        if (
          oldProps.children === newProps.children &&
          !hasLegacyContextChanged()
        ) {
          return bailoutOnAlreadyFinishedWork(
            current,
            workInProgress,
            renderLanes,
          );
        }
      } else {
        // The context value changed. Search for matching consumers and schedule
        // them to update.
        propagateContextChange(workInProgress, context, renderLanes);
      }
    }
  }

  const newChildren = newProps.children;
  reconcileChildren(current, workInProgress, newChildren, renderLanes);
  return workInProgress.child;
}

let hasWarnedAboutUsingContextAsConsumer = false;

function updateContextConsumer(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  let context: ReactContext<any> = workInProgress.type;
  // The logic below for Context differs depending on PROD or DEV mode. In
  // DEV mode, we create a separate object for Context.Consumer that acts
  // like a proxy to Context. This proxy object adds unnecessary code in PROD
  // so we use the old behaviour (Context.Consumer references Context) to
  // reduce size and overhead. The separate object references context via
  // a property called "_context", which also gives us the ability to check
  // in DEV mode if this property exists or not and warn if it does not.
  if (__DEV__) {
    if ((context as any)._context === undefined) {
      // This may be because it's a Context (rather than a Consumer).
      // Or it may be because it's older React where they're the same thing.
      // We only want to warn if we're sure it's a new React.
      if (context !== context.Consumer) {
        if (!hasWarnedAboutUsingContextAsConsumer) {
          hasWarnedAboutUsingContextAsConsumer = true;
          console.error(
            'Rendering <Context> directly is not supported and will be removed in ' +
              'a future major release. Did you mean to render <Context.Consumer> instead?',
          );
        }
      }
    } else {
      context = (context as any)._context;
    }
  }
  const newProps = workInProgress.pendingProps;
  const render = newProps.children;

  if (__DEV__) {
    if (typeof render !== 'function') {
      console.error(
        'A context consumer was rendered with multiple children, or a child ' +
          "that isn't a function. A context consumer expects a single child " +
          'that is a function. If you did pass a function, make sure there ' +
          'is no trailing or leading whitespace around it.',
      );
    }
  }

  prepareToReadContext(workInProgress, renderLanes);
  const newValue = readContext(context);
  if (enableSchedulingProfiler) {
    markComponentRenderStarted(workInProgress);
  }
  let newChildren;
  if (__DEV__) {
    ReactCurrentOwner.current = workInProgress;
    setIsRendering(true);
    newChildren = render(newValue);
    setIsRendering(false);
  } else {
    newChildren = render(newValue);
  }
  if (enableSchedulingProfiler) {
    markComponentRenderStopped();
  }

  // React DevTools reads this flag.
  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, newChildren, renderLanes);
  return workInProgress.child;
}
