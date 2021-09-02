import ReactSharedInternals from "../../shared/ReactSharedInternals";
import { Lane, Lanes, NoLanes } from "./ReactFiberLane.old";
import { HookFlags } from "./ReactHookEffectTags";
import { Dispatcher, Fiber, HookType } from "./ReactInternalTypes";

const {ReactCurrentDispatcher, ReactCurrentBatchConfig} = ReactSharedInternals;


// Whether an update was scheduled at any point during the render phase. This
// does not get reset if we do another render pass; only when we're completely
// finished evaluating this component. This is an optimization so we know
// whether we need to clear render phase updates after a throw.
let didScheduleRenderPhaseUpdate = false;

let currentlyRenderingFiber: Fiber = (null as any);

let renderLanes: Lanes = NoLanes;

let currentHook: Hook | null = null;
let workInProgressHook: Hook | null = null;

// In DEV, this list ensures that hooks are called in the same order between renders.
// The list stores the order of hooks used during the initial render (mount).
// Subsequent renders (updates) reference this list.
let hookTypesDev: Array<HookType> | null = null;
let hookTypesUpdateIndexDev = -1;

let currentHookNameInDev: HookType | null = null;

let didScheduleRenderPhaseUpdateDuringThisPass = false;


export type Hook = {
  memoizedState: any,
  baseState: any,
  baseQueue: Update<any, any> | null,
  queue: UpdateQueue<any, any> | null,
  next: Hook | null,
};

export type Effect = {
  tag: HookFlags,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: Array<mixed> | null,
  next: Effect,
};


export type FunctionComponentUpdateQueue = {lastEffect: Effect | null};


type Update<S, A> = {
  lane: Lane,
  action: A,
  eagerReducer: ((s:S, a:A) => S) | null,
  eagerState: S | null,
  next: Update<S, A>,
};

export type UpdateQueue<S, A> = {
  pending: Update<S, A> | null,
  interleaved: Update<S, A> | null,
  lanes: Lanes,
  dispatch: (a: A) => mixed | null,
  lastRenderedReducer: ((s: S, a: A) => S) | null,
  lastRenderedState: S | null,
};

let isUpdatingOpaqueValueInRenderPhase = false;
export function getIsUpdatingOpaqueValueInRenderPhaseInDEV(): boolean | void {
  if (__DEV__) {
    return isUpdatingOpaqueValueInRenderPhase;
  }
}
export const ContextOnlyDispatcher: Dispatcher = {
  // readContext,

  // useCallback: throwInvalidHookError,
  // useContext: throwInvalidHookError,
  // useEffect: throwInvalidHookError,
  // useImperativeHandle: throwInvalidHookError,
  // useLayoutEffect: throwInvalidHookError,
  // useMemo: throwInvalidHookError,
  // useReducer: throwInvalidHookError,
  // useRef: throwInvalidHookError,
  // useState: throwInvalidHookError,
  // useDebugValue: throwInvalidHookError,
  // useDeferredValue: throwInvalidHookError,
  // useTransition: throwInvalidHookError,
  // useMutableSource: throwInvalidHookError,
  // useOpaqueIdentifier: throwInvalidHookError,

  // unstable_isNewReconciler: enableNewReconciler,
};


export function resetHooksAfterThrow(): void {
  // We can assume the previous dispatcher is always this one, since we set it
  // at the beginning of the render phase and there's no re-entrancy.
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

  if (didScheduleRenderPhaseUpdate) {
    // There were render phase updates. These are only valid for this render
    // phase, which we are now aborting. Remove the updates from the queues so
    // they do not persist to the next render. Do not remove updates from hooks
    // that weren't processed.
    //
    // Only reset the updates from the queue if it has a clone. If it does
    // not have a clone, that means it wasn't processed, and the updates were
    // scheduled before we entered the render phase.
    let hook: Hook | null = currentlyRenderingFiber.memoizedState;
    while (hook !== null) {
      const queue = hook.queue;
      if (queue !== null) {
        queue.pending = null;
      }
      hook = hook.next;
    }
    didScheduleRenderPhaseUpdate = false;
  }

  renderLanes = NoLanes;
  currentlyRenderingFiber = (null as any);

  currentHook = null;
  workInProgressHook = null;

  if (__DEV__) {
    hookTypesDev = null;
    hookTypesUpdateIndexDev = -1;

    currentHookNameInDev = null;

    isUpdatingOpaqueValueInRenderPhase = false;
  }

  didScheduleRenderPhaseUpdateDuringThisPass = false;
}
