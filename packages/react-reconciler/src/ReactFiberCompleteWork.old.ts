import invariant from "../../shared/invariant";
import { enableCache, enableProfilerTimer, enableSuspenseCallback, enableScopeAPI } from "../../shared/ReactFeatureFlags";
import { ReactContext } from "../../shared/ReactTypes";
import { SpawnedCachePool } from "./ReactFiberCacheComponent.new";
import { Snapshot, DidCapture, NoFlags, Update, Visibility, Placement, StaticMask } from "./ReactFiberFlags";
import { Lanes, SomeRetryLane, OffscreenLane, includesSomeLane, Lane, mergeLanes, NoLanes } from "./ReactFiberLane.old";
import { OffscreenState } from "./ReactFiberOffscreenComponent";
import { subtreeRenderLanes } from "./ReactFiberWorkLoop.old";
import { Fiber, Wakeable } from "./ReactInternalTypes";
import { ProfileMode, NoMode, ConcurrentMode } from "./ReactTypeOfMode";
import { IndeterminateComponent, LazyComponent, SimpleMemoComponent, FunctionComponent, ForwardRef, Fragment, Mode, Profiler, ContextConsumer, MemoComponent, ClassComponent, HostRoot, HostComponent, HostText, SuspenseComponent, HostPortal, ContextProvider, IncompleteClassComponent, SuspenseListComponent, ScopeComponent, OffscreenComponent, LegacyHiddenComponent, CacheComponent } from "./ReactWorkTags";
import { now } from "./Scheduler";

function bubbleProperties(completedWork: Fiber) {
  const didBailout =
    completedWork.alternate !== null &&
    completedWork.alternate.child === completedWork.child;

  let newChildLanes = NoLanes;
  let subtreeFlags = NoFlags;

  if (!didBailout) {
    // Bubble up the earliest expiration time.
    if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
      // In profiling mode, resetChildExpirationTime is also used to reset
      // profiler durations.
      let actualDuration = completedWork.actualDuration!;
      let treeBaseDuration = ((completedWork.selfBaseDuration as any) as number);

      let child = completedWork.child;
      while (child !== null) {
        newChildLanes = mergeLanes(
          newChildLanes,
          mergeLanes(child.lanes, child.childLanes),
        );

        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags;

        // When a fiber is cloned, its actualDuration is reset to 0. This value will
        // only be updated if work is done on the fiber (i.e. it doesn't bailout).
        // When work is done, it should bubble to the parent's actualDuration. If
        // the fiber has not been cloned though, (meaning no work was done), then
        // this value will reflect the amount of time spent working on a previous
        // render. In that case it should not bubble. We determine whether it was
        // cloned by comparing the child pointer.
        actualDuration += child.actualDuration!;

        treeBaseDuration += child.treeBaseDuration!;
        child = child.sibling;
      }

      completedWork.actualDuration = actualDuration;
      completedWork.treeBaseDuration = treeBaseDuration;
    } else {
      let child = completedWork.child;
      while (child !== null) {
        newChildLanes = mergeLanes(
          newChildLanes,
          mergeLanes(child.lanes, child.childLanes),
        );

        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags;

        // Update the return pointer so the tree is consistent. This is a code
        // smell because it assumes the commit phase is never concurrent with
        // the render phase. Will address during refactor to alternate model.
        child.return = completedWork;

        child = child.sibling;
      }
    }

    completedWork.subtreeFlags |= subtreeFlags;
  } else {
    // Bubble up the earliest expiration time.
    if (enableProfilerTimer && (completedWork.mode & ProfileMode) !== NoMode) {
      // In profiling mode, resetChildExpirationTime is also used to reset
      // profiler durations.
      let treeBaseDuration = ((completedWork.selfBaseDuration as any) as number);

      let child = completedWork.child;
      while (child !== null) {
        newChildLanes = mergeLanes(
          newChildLanes,
          mergeLanes(child.lanes, child.childLanes),
        );

        // "Static" flags share the lifetime of the fiber/hook they belong to,
        // so we should bubble those up even during a bailout. All the other
        // flags have a lifetime only of a single render + commit, so we should
        // ignore them.
        subtreeFlags |= child.subtreeFlags & StaticMask;
        subtreeFlags |= child.flags & StaticMask;

        treeBaseDuration += child.treeBaseDuration!;
        child = child.sibling;
      }

      completedWork.treeBaseDuration = treeBaseDuration;
    } else {
      let child = completedWork.child;
      while (child !== null) {
        newChildLanes = mergeLanes(
          newChildLanes,
          mergeLanes(child.lanes, child.childLanes),
        );

        // "Static" flags share the lifetime of the fiber/hook they belong to,
        // so we should bubble those up even during a bailout. All the other
        // flags have a lifetime only of a single render + commit, so we should
        // ignore them.
        subtreeFlags |= child.subtreeFlags & StaticMask;
        subtreeFlags |= child.flags & StaticMask;

        // Update the return pointer so the tree is consistent. This is a code
        // smell because it assumes the commit phase is never concurrent with
        // the render phase. Will address during refactor to alternate model.
        child.return = completedWork;

        child = child.sibling;
      }
    }

    completedWork.subtreeFlags |= subtreeFlags;
  }

  completedWork.childLanes = newChildLanes;

  return didBailout;
}

export function completeWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  const newProps = workInProgress.pendingProps;

  switch (workInProgress.tag) {
    case IndeterminateComponent:
    case LazyComponent:
    case SimpleMemoComponent:
    case FunctionComponent:
    case ForwardRef:
    case Fragment:
    case Mode:
    case Profiler:
    case ContextConsumer:
    case MemoComponent:
      bubbleProperties(workInProgress);
      return null;
    // case ClassComponent: {
    //   const Component = workInProgress.type;
    //   if (isLegacyContextProvider(Component)) {
    //     popLegacyContext(workInProgress);
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // }
    // case HostRoot: {
    //   const fiberRoot = (workInProgress.stateNode: FiberRoot);
    //   if (enableCache) {
    //     popRootCachePool(fiberRoot, renderLanes);

    //     const cache: Cache = workInProgress.memoizedState.cache;
    //     popCacheProvider(workInProgress, cache);
    //   }
    //   popHostContainer(workInProgress);
    //   popTopLevelLegacyContextObject(workInProgress);
    //   resetMutableSourceWorkInProgressVersions();
    //   if (fiberRoot.pendingContext) {
    //     fiberRoot.context = fiberRoot.pendingContext;
    //     fiberRoot.pendingContext = null;
    //   }
    //   if (current === null || current.child === null) {
    //     // If we hydrated, pop so that we can delete any remaining children
    //     // that weren't hydrated.
    //     const wasHydrated = popHydrationState(workInProgress);
    //     if (wasHydrated) {
    //       // If we hydrated, then we'll need to schedule an update for
    //       // the commit side-effects on the root.
    //       markUpdate(workInProgress);
    //     } else if (!fiberRoot.hydrate) {
    //       // Schedule an effect to clear this container at the start of the next commit.
    //       // This handles the case of React rendering into a container with previous children.
    //       // It's also safe to do for updates too, because current.child would only be null
    //       // if the previous render was null (so the the container would already be empty).
    //       workInProgress.flags |= Snapshot;
    //     }
    //   }
    //   updateHostContainer(current, workInProgress);
    //   bubbleProperties(workInProgress);
    //   return null;
    // }
    // case HostComponent: {
    //   popHostContext(workInProgress);
    //   const rootContainerInstance = getRootHostContainer();
    //   const type = workInProgress.type;
    //   if (current !== null && workInProgress.stateNode != null) {
    //     updateHostComponent(
    //       current,
    //       workInProgress,
    //       type,
    //       newProps,
    //       rootContainerInstance,
    //     );

    //     if (current.ref !== workInProgress.ref) {
    //       markRef(workInProgress);
    //     }
    //   } else {
    //     if (!newProps) {
    //       invariant(
    //         workInProgress.stateNode !== null,
    //         'We must have new props for new mounts. This error is likely ' +
    //           'caused by a bug in React. Please file an issue.',
    //       );
    //       // This can happen when we abort work.
    //       bubbleProperties(workInProgress);
    //       return null;
    //     }

    //     const currentHostContext = getHostContext();
    //     // TODO: Move createInstance to beginWork and keep it on a context
    //     // "stack" as the parent. Then append children as we go in beginWork
    //     // or completeWork depending on whether we want to add them top->down or
    //     // bottom->up. Top->down is faster in IE11.
    //     const wasHydrated = popHydrationState(workInProgress);
    //     if (wasHydrated) {
    //       // TODO: Move this and createInstance step into the beginPhase
    //       // to consolidate.
    //       if (
    //         prepareToHydrateHostInstance(
    //           workInProgress,
    //           rootContainerInstance,
    //           currentHostContext,
    //         )
    //       ) {
    //         // If changes to the hydrated node need to be applied at the
    //         // commit-phase we mark this as such.
    //         markUpdate(workInProgress);
    //       }
    //     } else {
    //       const instance = createInstance(
    //         type,
    //         newProps,
    //         rootContainerInstance,
    //         currentHostContext,
    //         workInProgress,
    //       );

    //       appendAllChildren(instance, workInProgress, false, false);

    //       workInProgress.stateNode = instance;

    //       // Certain renderers require commit-time effects for initial mount.
    //       // (eg DOM renderer supports auto-focus for certain elements).
    //       // Make sure such renderers get scheduled for later work.
    //       if (
    //         finalizeInitialChildren(
    //           instance,
    //           type,
    //           newProps,
    //           rootContainerInstance,
    //           currentHostContext,
    //         )
    //       ) {
    //         markUpdate(workInProgress);
    //       }
    //     }

    //     if (workInProgress.ref !== null) {
    //       // If there is a ref on a host node we need to schedule a callback
    //       markRef(workInProgress);
    //     }
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // }
    // case HostText: {
    //   const newText = newProps;
    //   if (current && workInProgress.stateNode != null) {
    //     const oldText = current.memoizedProps;
    //     // If we have an alternate, that means this is an update and we need
    //     // to schedule a side-effect to do the updates.
    //     updateHostText(current, workInProgress, oldText, newText);
    //   } else {
    //     if (typeof newText !== 'string') {
    //       invariant(
    //         workInProgress.stateNode !== null,
    //         'We must have new props for new mounts. This error is likely ' +
    //           'caused by a bug in React. Please file an issue.',
    //       );
    //       // This can happen when we abort work.
    //     }
    //     const rootContainerInstance = getRootHostContainer();
    //     const currentHostContext = getHostContext();
    //     const wasHydrated = popHydrationState(workInProgress);
    //     if (wasHydrated) {
    //       if (prepareToHydrateHostTextInstance(workInProgress)) {
    //         markUpdate(workInProgress);
    //       }
    //     } else {
    //       workInProgress.stateNode = createTextInstance(
    //         newText,
    //         rootContainerInstance,
    //         currentHostContext,
    //         workInProgress,
    //       );
    //     }
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // }
    // case SuspenseComponent: {
    //   popSuspenseContext(workInProgress);
    //   const nextState: null | SuspenseState = workInProgress.memoizedState;

    //   if (enableSuspenseServerRenderer) {
    //     if (nextState !== null && nextState.dehydrated !== null) {
    //       if (current === null) {
    //         const wasHydrated = popHydrationState(workInProgress);
    //         invariant(
    //           wasHydrated,
    //           'A dehydrated suspense component was completed without a hydrated node. ' +
    //             'This is probably a bug in React.',
    //         );
    //         prepareToHydrateHostSuspenseInstance(workInProgress);
    //         bubbleProperties(workInProgress);
    //         if (enableProfilerTimer) {
    //           if ((workInProgress.mode & ProfileMode) !== NoMode) {
    //             const isTimedOutSuspense = nextState !== null;
    //             if (isTimedOutSuspense) {
    //               // Don't count time spent in a timed out Suspense subtree as part of the base duration.
    //               const primaryChildFragment = workInProgress.child;
    //               if (primaryChildFragment !== null) {
    //                 // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
    //                 workInProgress.treeBaseDuration -= ((primaryChildFragment.treeBaseDuration: any): number);
    //               }
    //             }
    //           }
    //         }
    //         return null;
    //       } else {
    //         // We should never have been in a hydration state if we didn't have a current.
    //         // However, in some of those paths, we might have reentered a hydration state
    //         // and then we might be inside a hydration state. In that case, we'll need to exit out of it.
    //         resetHydrationState();
    //         if ((workInProgress.flags & DidCapture) === NoFlags) {
    //           // This boundary did not suspend so it's now hydrated and unsuspended.
    //           workInProgress.memoizedState = null;
    //         }
    //         // If nothing suspended, we need to schedule an effect to mark this boundary
    //         // as having hydrated so events know that they're free to be invoked.
    //         // It's also a signal to replay events and the suspense callback.
    //         // If something suspended, schedule an effect to attach retry listeners.
    //         // So we might as well always mark this.
    //         workInProgress.flags |= Update;
    //         bubbleProperties(workInProgress);
    //         if (enableProfilerTimer) {
    //           if ((workInProgress.mode & ProfileMode) !== NoMode) {
    //             const isTimedOutSuspense = nextState !== null;
    //             if (isTimedOutSuspense) {
    //               // Don't count time spent in a timed out Suspense subtree as part of the base duration.
    //               const primaryChildFragment = workInProgress.child;
    //               if (primaryChildFragment !== null) {
    //                 // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
    //                 workInProgress.treeBaseDuration -= ((primaryChildFragment.treeBaseDuration: any): number);
    //               }
    //             }
    //           }
    //         }
    //         return null;
    //       }
    //     }
    //   }

    //   if ((workInProgress.flags & DidCapture) !== NoFlags) {
    //     // Something suspended. Re-render with the fallback children.
    //     workInProgress.lanes = renderLanes;
    //     // Do not reset the effect list.
    //     if (
    //       enableProfilerTimer &&
    //       (workInProgress.mode & ProfileMode) !== NoMode
    //     ) {
    //       transferActualDuration(workInProgress);
    //     }
    //     // Don't bubble properties in this case.
    //     return workInProgress;
    //   }

    //   const nextDidTimeout = nextState !== null;
    //   let prevDidTimeout = false;
    //   if (current === null) {
    //     popHydrationState(workInProgress);
    //   } else {
    //     const prevState: null | SuspenseState = current.memoizedState;
    //     prevDidTimeout = prevState !== null;
    //   }

    //   // If the suspended state of the boundary changes, we need to schedule
    //   // an effect to toggle the subtree's visibility. When we switch from
    //   // fallback -> primary, the inner Offscreen fiber schedules this effect
    //   // as part of its normal complete phase. But when we switch from
    //   // primary -> fallback, the inner Offscreen fiber does not have a complete
    //   // phase. So we need to schedule its effect here.
    //   //
    //   // We also use this flag to connect/disconnect the effects, but the same
    //   // logic applies: when re-connecting, the Offscreen fiber's complete
    //   // phase will handle scheduling the effect. It's only when the fallback
    //   // is active that we have to do anything special.
    //   if (nextDidTimeout && !prevDidTimeout) {
    //     const offscreenFiber: Fiber = (workInProgress.child: any);
    //     offscreenFiber.flags |= Visibility;

    //     // TODO: This will still suspend a synchronous tree if anything
    //     // in the concurrent tree already suspended during this render.
    //     // This is a known bug.
    //     if ((workInProgress.mode & ConcurrentMode) !== NoMode) {
    //       // TODO: Move this back to throwException because this is too late
    //       // if this is a large tree which is common for initial loads. We
    //       // don't know if we should restart a render or not until we get
    //       // this marker, and this is too late.
    //       // If this render already had a ping or lower pri updates,
    //       // and this is the first time we know we're going to suspend we
    //       // should be able to immediately restart from within throwException.
    //       const hasInvisibleChildContext =
    //         current === null &&
    //         workInProgress.memoizedProps.unstable_avoidThisFallback !== true;
    //       if (
    //         hasInvisibleChildContext ||
    //         hasSuspenseContext(
    //           suspenseStackCursor.current,
    //           (InvisibleParentSuspenseContext as SuspenseContext),
    //         )
    //       ) {
    //         // If this was in an invisible tree or a new render, then showing
    //         // this boundary is ok.
    //         renderDidSuspend();
    //       } else {
    //         // Otherwise, we're going to have to hide content so we should
    //         // suspend for longer if possible.
    //         renderDidSuspendDelayIfPossible();
    //       }
    //     }
    //   }

    //   const wakeables: Set<Wakeable> | null = (workInProgress.updateQueue as any);
    //   if (wakeables !== null) {
    //     // Schedule an effect to attach a retry listener to the promise.
    //     // TODO: Move to passive phase
    //     workInProgress.flags |= Update;
    //   }

    //   if (
    //     enableSuspenseCallback &&
    //     workInProgress.updateQueue !== null &&
    //     workInProgress.memoizedProps.suspenseCallback != null
    //   ) {
    //     // Always notify the callback
    //     // TODO: Move to passive phase
    //     workInProgress.flags |= Update;
    //   }
    //   bubbleProperties(workInProgress);
    //   if (enableProfilerTimer) {
    //     if ((workInProgress.mode & ProfileMode) !== NoMode) {
    //       if (nextDidTimeout) {
    //         // Don't count time spent in a timed out Suspense subtree as part of the base duration.
    //         const primaryChildFragment = workInProgress.child;
    //         if (primaryChildFragment !== null) {
    //           // $FlowFixMe Flow doesn't support type casting in combination with the -= operator
    //           workInProgress.treeBaseDuration -= ((primaryChildFragment.treeBaseDuration as any): number);
    //         }
    //       }
    //     }
    //   }
    //   return null;
    // }
    // case HostPortal:
    //   popHostContainer(workInProgress);
    //   updateHostContainer(current, workInProgress);
    //   if (current === null) {
    //     preparePortalMount(workInProgress.stateNode.containerInfo);
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // case ContextProvider:
    //   // Pop provider fiber
    //   const context: ReactContext<any> = workInProgress.type._context;
    //   popProvider(context, workInProgress);
    //   bubbleProperties(workInProgress);
    //   return null;
    // case IncompleteClassComponent: {
    //   // Same as class component case. I put it down here so that the tags are
    //   // sequential to ensure this switch is compiled to a jump table.
    //   const Component = workInProgress.type;
    //   if (isLegacyContextProvider(Component)) {
    //     popLegacyContext(workInProgress);
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // }
    // case SuspenseListComponent: {
    //   popSuspenseContext(workInProgress);

    //   const renderState: null | SuspenseListRenderState =
    //     workInProgress.memoizedState;

    //   if (renderState === null) {
    //     // We're running in the default, "independent" mode.
    //     // We don't do anything in this mode.
    //     bubbleProperties(workInProgress);
    //     return null;
    //   }

    //   let didSuspendAlready = (workInProgress.flags & DidCapture) !== NoFlags;

    //   const renderedTail = renderState.rendering;
    //   if (renderedTail === null) {
    //     // We just rendered the head.
    //     if (!didSuspendAlready) {
    //       // This is the first pass. We need to figure out if anything is still
    //       // suspended in the rendered set.

    //       // If new content unsuspended, but there's still some content that
    //       // didn't. Then we need to do a second pass that forces everything
    //       // to keep showing their fallbacks.

    //       // We might be suspended if something in this render pass suspended, or
    //       // something in the previous committed pass suspended. Otherwise,
    //       // there's no chance so we can skip the expensive call to
    //       // findFirstSuspended.
    //       const cannotBeSuspended =
    //         renderHasNotSuspendedYet() &&
    //         (current === null || (current.flags & DidCapture) === NoFlags);
    //       if (!cannotBeSuspended) {
    //         let row = workInProgress.child;
    //         while (row !== null) {
    //           const suspended = findFirstSuspended(row);
    //           if (suspended !== null) {
    //             didSuspendAlready = true;
    //             workInProgress.flags |= DidCapture;
    //             cutOffTailIfNeeded(renderState, false);

    //             // If this is a newly suspended tree, it might not get committed as
    //             // part of the second pass. In that case nothing will subscribe to
    //             // its thennables. Instead, we'll transfer its thennables to the
    //             // SuspenseList so that it can retry if they resolve.
    //             // There might be multiple of these in the list but since we're
    //             // going to wait for all of them anyway, it doesn't really matter
    //             // which ones gets to ping. In theory we could get clever and keep
    //             // track of how many dependencies remain but it gets tricky because
    //             // in the meantime, we can add/remove/change items and dependencies.
    //             // We might bail out of the loop before finding any but that
    //             // doesn't matter since that means that the other boundaries that
    //             // we did find already has their listeners attached.
    //             const newThennables = suspended.updateQueue;
    //             if (newThennables !== null) {
    //               workInProgress.updateQueue = newThennables;
    //               workInProgress.flags |= Update;
    //             }

    //             // Rerender the whole list, but this time, we'll force fallbacks
    //             // to stay in place.
    //             // Reset the effect flags before doing the second pass since that's now invalid.
    //             // Reset the child fibers to their original state.
    //             workInProgress.subtreeFlags = NoFlags;
    //             resetChildFibers(workInProgress, renderLanes);

    //             // Set up the Suspense Context to force suspense and immediately
    //             // rerender the children.
    //             pushSuspenseContext(
    //               workInProgress,
    //               setShallowSuspenseContext(
    //                 suspenseStackCursor.current,
    //                 ForceSuspenseFallback,
    //               ),
    //             );
    //             // Don't bubble properties in this case.
    //             return workInProgress.child;
    //           }
    //           row = row.sibling;
    //         }
    //       }

    //       if (renderState.tail !== null && now() > getRenderTargetTime()) {
    //         // We have already passed our CPU deadline but we still have rows
    //         // left in the tail. We'll just give up further attempts to render
    //         // the main content and only render fallbacks.
    //         workInProgress.flags |= DidCapture;
    //         didSuspendAlready = true;

    //         cutOffTailIfNeeded(renderState, false);

    //         // Since nothing actually suspended, there will nothing to ping this
    //         // to get it started back up to attempt the next item. While in terms
    //         // of priority this work has the same priority as this current render,
    //         // it's not part of the same transition once the transition has
    //         // committed. If it's sync, we still want to yield so that it can be
    //         // painted. Conceptually, this is really the same as pinging.
    //         // We can use any RetryLane even if it's the one currently rendering
    //         // since we're leaving it behind on this node.
    //         workInProgress.lanes = SomeRetryLane;
    //       }
    //     } else {
    //       cutOffTailIfNeeded(renderState, false);
    //     }
    //     // Next we're going to render the tail.
    //   } else {
    //     // Append the rendered row to the child list.
    //     if (!didSuspendAlready) {
    //       const suspended = findFirstSuspended(renderedTail);
    //       if (suspended !== null) {
    //         workInProgress.flags |= DidCapture;
    //         didSuspendAlready = true;

    //         // Ensure we transfer the update queue to the parent so that it doesn't
    //         // get lost if this row ends up dropped during a second pass.
    //         const newThennables = suspended.updateQueue;
    //         if (newThennables !== null) {
    //           workInProgress.updateQueue = newThennables;
    //           workInProgress.flags |= Update;
    //         }

    //         cutOffTailIfNeeded(renderState, true);
    //         // This might have been modified.
    //         if (
    //           renderState.tail === null &&
    //           renderState.tailMode === 'hidden' &&
    //           !renderedTail.alternate &&
    //           !getIsHydrating() // We don't cut it if we're hydrating.
    //         ) {
    //           // We're done.
    //           bubbleProperties(workInProgress);
    //           return null;
    //         }
    //       } else if (
    //         // The time it took to render last row is greater than the remaining
    //         // time we have to render. So rendering one more row would likely
    //         // exceed it.
    //         now() * 2 - renderState.renderingStartTime >
    //           getRenderTargetTime() &&
    //         renderLanes !== OffscreenLane
    //       ) {
    //         // We have now passed our CPU deadline and we'll just give up further
    //         // attempts to render the main content and only render fallbacks.
    //         // The assumption is that this is usually faster.
    //         workInProgress.flags |= DidCapture;
    //         didSuspendAlready = true;

    //         cutOffTailIfNeeded(renderState, false);

    //         // Since nothing actually suspended, there will nothing to ping this
    //         // to get it started back up to attempt the next item. While in terms
    //         // of priority this work has the same priority as this current render,
    //         // it's not part of the same transition once the transition has
    //         // committed. If it's sync, we still want to yield so that it can be
    //         // painted. Conceptually, this is really the same as pinging.
    //         // We can use any RetryLane even if it's the one currently rendering
    //         // since we're leaving it behind on this node.
    //         workInProgress.lanes = SomeRetryLane;
    //       }
    //     }
    //     if (renderState.isBackwards) {
    //       // The effect list of the backwards tail will have been added
    //       // to the end. This breaks the guarantee that life-cycles fire in
    //       // sibling order but that isn't a strong guarantee promised by React.
    //       // Especially since these might also just pop in during future commits.
    //       // Append to the beginning of the list.
    //       renderedTail.sibling = workInProgress.child;
    //       workInProgress.child = renderedTail;
    //     } else {
    //       const previousSibling = renderState.last;
    //       if (previousSibling !== null) {
    //         previousSibling.sibling = renderedTail;
    //       } else {
    //         workInProgress.child = renderedTail;
    //       }
    //       renderState.last = renderedTail;
    //     }
    //   }

    //   if (renderState.tail !== null) {
    //     // We still have tail rows to render.
    //     // Pop a row.
    //     const next = renderState.tail;
    //     renderState.rendering = next;
    //     renderState.tail = next.sibling;
    //     renderState.renderingStartTime = now();
    //     next.sibling = null;

    //     // Restore the context.
    //     // TODO: We can probably just avoid popping it instead and only
    //     // setting it the first time we go from not suspended to suspended.
    //     let suspenseContext = suspenseStackCursor.current;
    //     if (didSuspendAlready) {
    //       suspenseContext = setShallowSuspenseContext(
    //         suspenseContext,
    //         ForceSuspenseFallback,
    //       );
    //     } else {
    //       suspenseContext = setDefaultShallowSuspenseContext(suspenseContext);
    //     }
    //     pushSuspenseContext(workInProgress, suspenseContext);
    //     // Do a pass over the next row.
    //     // Don't bubble properties in this case.
    //     return next;
    //   }
    //   bubbleProperties(workInProgress);
    //   return null;
    // }
    // case ScopeComponent: {
    //   if (enableScopeAPI) {
    //     if (current === null) {
    //       const scopeInstance: ReactScopeInstance = createScopeInstance();
    //       workInProgress.stateNode = scopeInstance;
    //       prepareScopeUpdate(scopeInstance, workInProgress);
    //       if (workInProgress.ref !== null) {
    //         markRef(workInProgress);
    //         markUpdate(workInProgress);
    //       }
    //     } else {
    //       if (workInProgress.ref !== null) {
    //         markUpdate(workInProgress);
    //       }
    //       if (current.ref !== workInProgress.ref) {
    //         markRef(workInProgress);
    //       }
    //     }
    //     bubbleProperties(workInProgress);
    //     return null;
    //   }
    //   break;
    // }
    // case OffscreenComponent:
    // case LegacyHiddenComponent: {
    //   popRenderLanes(workInProgress);
    //   const nextState: OffscreenState | null = workInProgress.memoizedState;
    //   const nextIsHidden = nextState !== null;

    //   if (current !== null) {
    //     const prevState: OffscreenState | null = current.memoizedState;
    //     const prevIsHidden = prevState !== null;
    //     if (
    //       prevIsHidden !== nextIsHidden &&
    //       newProps.mode !== 'unstable-defer-without-hiding' &&
    //       // LegacyHidden doesn't do any hiding — it only pre-renders.
    //       workInProgress.tag !== LegacyHiddenComponent
    //     ) {
    //       workInProgress.flags |= Visibility;
    //     }
    //   }

    //   if (!nextIsHidden || (workInProgress.mode & ConcurrentMode) === NoMode) {
    //     bubbleProperties(workInProgress);
    //   } else {
    //     // Don't bubble properties for hidden children unless we're rendering
    //     // at offscreen priority.
    //     if (includesSomeLane(subtreeRenderLanes, (OffscreenLane as Lane))) {
    //       bubbleProperties(workInProgress);
    //       if (supportsMutation) {
    //         // Check if there was an insertion or update in the hidden subtree.
    //         // If so, we need to hide those nodes in the commit phase, so
    //         // schedule a visibility effect.
    //         if (
    //           workInProgress.tag !== LegacyHiddenComponent &&
    //           workInProgress.subtreeFlags & (Placement | Update) &&
    //           newProps.mode !== 'unstable-defer-without-hiding'
    //         ) {
    //           workInProgress.flags |= Visibility;
    //         }
    //       }
    //     }
    //   }

    //   if (enableCache) {
    //     const spawnedCachePool: SpawnedCachePool | null = (workInProgress.updateQueue as any);
    //     if (spawnedCachePool !== null) {
    //       popCachePool(workInProgress);
    //     }
    //   }

    //   return null;
    // }
    // case CacheComponent: {
    //   if (enableCache) {
    //     const cache: Cache = workInProgress.memoizedState.cache;
    //     popCacheProvider(workInProgress, cache);
    //     bubbleProperties(workInProgress);
    //     return null;
    //   }
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