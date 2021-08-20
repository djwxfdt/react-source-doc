import { Lane, Lanes } from "./ReactFiberLane.old";

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