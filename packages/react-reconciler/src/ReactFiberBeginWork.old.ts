import checkPropTypes from "../../shared/checkPropTypes";
import getComponentNameFromType from "../../shared/getComponentNameFromType";
import invariant from "../../shared/invariant";
import { enableCache } from "../../shared/ReactFeatureFlags";
import { DidCapture, NoFlags } from "./ReactFiberFlags";
import { Lanes, NoLanes } from "./ReactFiberLane.old";
import { Fiber } from "./ReactInternalTypes";
import { IndeterminateComponent, LazyComponent, FunctionComponent, ClassComponent, HostRoot, HostComponent, HostText, SuspenseComponent, HostPortal, ForwardRef, Fragment, Mode, Profiler, ContextProvider, ContextConsumer, MemoComponent, SimpleMemoComponent, IncompleteClassComponent, SuspenseListComponent, ScopeComponent, OffscreenComponent, LegacyHiddenComponent, CacheComponent } from "./ReactWorkTags";

export function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null | undefined {
  // if (__DEV__) {
  //   if (workInProgress._debugNeedsRemount && current !== null) {
  //     // This will restart the begin phase with a new fiber.
  //     return remountFiber(
  //       current,
  //       workInProgress,
  //       createFiberFromTypeAndProps(
  //         workInProgress.type,
  //         workInProgress.key,
  //         workInProgress.pendingProps,
  //         workInProgress._debugOwner || null,
  //         workInProgress.mode,
  //         workInProgress.lanes,
  //       ),
  //     );
  //   }
  // }

  // if (current !== null) {
  //   const oldProps = current.memoizedProps;
  //   const newProps = workInProgress.pendingProps;

  //   if (
  //     oldProps !== newProps ||
  //     hasLegacyContextChanged() ||
  //     // Force a re-render if the implementation changed due to hot reload:
  //     (__DEV__ ? workInProgress.type !== current.type : false)
  //   ) {
  //     // If props or context changed, mark the fiber as having performed work.
  //     // This may be unset if the props are determined to be equal later (memo).
  //     didReceiveUpdate = true;
  //   } else {
  //     // Neither props nor legacy context changes. Check if there's a pending
  //     // update or context change.
  //     const hasScheduledUpdateOrContext = checkScheduledUpdateOrContext(
  //       current,
  //       renderLanes,
  //     );
  //     if (
  //       !hasScheduledUpdateOrContext &&
  //       // If this is the second pass of an error or suspense boundary, there
  //       // may not be work scheduled on `current`, so we check for this flag.
  //       (workInProgress.flags & DidCapture) === NoFlags
  //     ) {
  //       // No pending updates or context. Bail out now.
  //       didReceiveUpdate = false;
  //       return attemptEarlyBailoutIfNoScheduledUpdate(
  //         current,
  //         workInProgress,
  //         renderLanes,
  //       );
  //     }
  //     if ((current.flags & ForceUpdateForLegacySuspense) !== NoFlags) {
  //       // This is a special case that only exists for legacy mode.
  //       // See https://github.com/facebook/react/pull/19216.
  //       didReceiveUpdate = true;
  //     } else {
  //       // An update was scheduled on this fiber, but there are no new props
  //       // nor legacy context. Set this to false. If an update queue or context
  //       // consumer produces a changed value, it will set this to true. Otherwise,
  //       // the component will assume the children have not changed and bail out.
  //       didReceiveUpdate = false;
  //     }
  //   }
  // } else {
  //   didReceiveUpdate = false;
  // }

  // // Before entering the begin phase, clear pending update priority.
  // // TODO: This assumes that we're about to evaluate the component and process
  // // the update queue. However, there's an exception: SimpleMemoComponent
  // // sometimes bails out later in the begin phase. This indicates that we should
  // // move this assignment out of the common path and into each branch.
  // workInProgress.lanes = NoLanes;

  // switch (workInProgress.tag) {
  //   case IndeterminateComponent: {
  //     return mountIndeterminateComponent(
  //       current,
  //       workInProgress,
  //       workInProgress.type,
  //       renderLanes,
  //     );
  //   }
  //   case LazyComponent: {
  //     const elementType = workInProgress.elementType;
  //     return mountLazyComponent(
  //       current,
  //       workInProgress,
  //       elementType,
  //       renderLanes,
  //     );
  //   }
  //   case FunctionComponent: {
  //     const Component = workInProgress.type;
  //     const unresolvedProps = workInProgress.pendingProps;
  //     const resolvedProps =
  //       workInProgress.elementType === Component
  //         ? unresolvedProps
  //         : resolveDefaultProps(Component, unresolvedProps);
  //     return updateFunctionComponent(
  //       current,
  //       workInProgress,
  //       Component,
  //       resolvedProps,
  //       renderLanes,
  //     );
  //   }
  //   case ClassComponent: {
  //     const Component = workInProgress.type;
  //     const unresolvedProps = workInProgress.pendingProps;
  //     const resolvedProps =
  //       workInProgress.elementType === Component
  //         ? unresolvedProps
  //         : resolveDefaultProps(Component, unresolvedProps);
  //     return updateClassComponent(
  //       current,
  //       workInProgress,
  //       Component,
  //       resolvedProps,
  //       renderLanes,
  //     );
  //   }
  //   case HostRoot:
  //     return updateHostRoot(current, workInProgress, renderLanes);
  //   case HostComponent:
  //     return updateHostComponent(current, workInProgress, renderLanes);
  //   case HostText:
  //     return updateHostText(current, workInProgress);
  //   case SuspenseComponent:
  //     return updateSuspenseComponent(current, workInProgress, renderLanes);
  //   case HostPortal:
  //     return updatePortalComponent(current, workInProgress, renderLanes);
  //   case ForwardRef: {
  //     const type = workInProgress.type;
  //     const unresolvedProps = workInProgress.pendingProps;
  //     const resolvedProps =
  //       workInProgress.elementType === type
  //         ? unresolvedProps
  //         : resolveDefaultProps(type, unresolvedProps);
  //     return updateForwardRef(
  //       current,
  //       workInProgress,
  //       type,
  //       resolvedProps,
  //       renderLanes,
  //     );
  //   }
  //   case Fragment:
  //     return updateFragment(current, workInProgress, renderLanes);
  //   case Mode:
  //     return updateMode(current, workInProgress, renderLanes);
  //   case Profiler:
  //     return updateProfiler(current, workInProgress, renderLanes);
  //   case ContextProvider:
  //     return updateContextProvider(current, workInProgress, renderLanes);
  //   case ContextConsumer:
  //     return updateContextConsumer(current, workInProgress, renderLanes);
  //   case MemoComponent: {
  //     const type = workInProgress.type;
  //     const unresolvedProps = workInProgress.pendingProps;
  //     // Resolve outer props first, then resolve inner props.
  //     let resolvedProps = resolveDefaultProps(type, unresolvedProps);
  //     if (__DEV__) {
  //       if (workInProgress.type !== workInProgress.elementType) {
  //         const outerPropTypes = type.propTypes;
  //         if (outerPropTypes) {
  //           checkPropTypes(
  //             outerPropTypes,
  //             resolvedProps, // Resolved for outer only
  //             'prop',
  //             getComponentNameFromType(type),
  //           );
  //         }
  //       }
  //     }
  //     resolvedProps = resolveDefaultProps(type.type, resolvedProps);
  //     return updateMemoComponent(
  //       current,
  //       workInProgress,
  //       type,
  //       resolvedProps,
  //       renderLanes,
  //     );
  //   }
  //   case SimpleMemoComponent: {
  //     return updateSimpleMemoComponent(
  //       current,
  //       workInProgress,
  //       workInProgress.type,
  //       workInProgress.pendingProps,
  //       renderLanes,
  //     );
  //   }
  //   case IncompleteClassComponent: {
  //     const Component = workInProgress.type;
  //     const unresolvedProps = workInProgress.pendingProps;
  //     const resolvedProps =
  //       workInProgress.elementType === Component
  //         ? unresolvedProps
  //         : resolveDefaultProps(Component, unresolvedProps);
  //     return mountIncompleteClassComponent(
  //       current,
  //       workInProgress,
  //       Component,
  //       resolvedProps,
  //       renderLanes,
  //     );
  //   }
  //   case SuspenseListComponent: {
  //     return updateSuspenseListComponent(current, workInProgress, renderLanes);
  //   }
  //   case ScopeComponent: {
  //     if (enableScopeAPI) {
  //       return updateScopeComponent(current, workInProgress, renderLanes);
  //     }
  //     break;
  //   }
  //   case OffscreenComponent: {
  //     return updateOffscreenComponent(current, workInProgress, renderLanes);
  //   }
  //   case LegacyHiddenComponent: {
  //     return updateLegacyHiddenComponent(current, workInProgress, renderLanes);
  //   }
  //   case CacheComponent: {
  //     if (enableCache) {
  //       return updateCacheComponent(current, workInProgress, renderLanes);
  //     }
  //     break;
  //   }
  // }
  invariant(
    false,
    'Unknown unit of work tag (%s). This error is likely caused by a bug in ' +
      'React. Please file an issue.',
    workInProgress.tag,
  );
}
