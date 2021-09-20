import { Container, getRootHostContext, HostContext } from "./ReactFiberHostConfig";
import { createCursor, push, StackCursor, pop } from "./ReactFiberStack.old";
import { Fiber } from "./ReactInternalTypes";

declare class NoContextT {}

const NO_CONTEXT: NoContextT = ({} as any);

const rootInstanceStackCursor: StackCursor<
  Container | NoContextT
> = createCursor(NO_CONTEXT);

const contextStackCursor: StackCursor<HostContext | NoContextT> = createCursor(
  NO_CONTEXT,
);
const contextFiberStackCursor: StackCursor<Fiber | NoContextT> = createCursor(
  NO_CONTEXT,
);

export function pushHostContainer(fiber: Fiber, nextRootInstance: Container) {
  // Push current root instance onto the stack;
  // This allows us to reset root when portals are popped.
  push(rootInstanceStackCursor, nextRootInstance, fiber);
  // Track the context and the Fiber that provided it.
  // This enables us to pop only Fibers that provide unique contexts.
  push(contextFiberStackCursor, fiber, fiber);

  // Finally, we need to push the host context to the stack.
  // However, we can't just call getRootHostContext() and push it because
  // we'd have a different number of entries on the stack depending on
  // whether getRootHostContext() throws somewhere in renderer code or not.
  // So we push an empty value first. This lets us safely unwind on errors.
  push(contextStackCursor, NO_CONTEXT, fiber);
  const nextRootContext = getRootHostContext(nextRootInstance);
  // Now that we know this function doesn't throw, replace it.
  pop(contextStackCursor, fiber);
  push(contextStackCursor, nextRootContext, fiber);
}
