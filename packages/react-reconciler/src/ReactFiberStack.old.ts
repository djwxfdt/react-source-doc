import { Fiber } from "./ReactInternalTypes";

export type StackCursor<T> = { current: T};


let index = -1;
const valueStack: Array<any> = [];
let fiberStack: Array<Fiber | null>;

if (__DEV__) {
  fiberStack = [];
}

export function createCursor<T>(defaultValue: T): StackCursor<T> {
  return {
    current: defaultValue,
  };
}

export function push<T>(cursor: StackCursor<T>, value: T, fiber: Fiber): void {
  index++;

  valueStack[index] = cursor.current;

  if (__DEV__) {
    fiberStack[index] = fiber;
  }

  cursor.current = value;
}