import { Lane, Lanes } from "./ReactFiberLane.old";
import { HookFlags } from "./ReactHookEffectTags";

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