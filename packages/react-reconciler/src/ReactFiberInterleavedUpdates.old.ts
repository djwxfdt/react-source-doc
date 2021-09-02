import type {UpdateQueue as HookQueue} from './ReactFiberHooks.old';
import type {SharedQueue as ClassQueue} from './ReactUpdateQueue.old';

let interleavedQueues: Array<
HookQueue<any, any> | ClassQueue<any>
> | null = null;

export function pushInterleavedQueue(
  queue: HookQueue<any, any> | ClassQueue<any>,
) {
  if (interleavedQueues === null) {
    interleavedQueues = [queue];
  } else {
    interleavedQueues.push(queue);
  }
}


export function enqueueInterleavedUpdates() {
  // Transfer the interleaved updates onto the main queue. Each queue has a
  // `pending` field and an `interleaved` field. When they are not null, they
  // point to the last node in a circular linked list. We need to append the
  // interleaved list to the end of the pending list by joining them into a
  // single, circular list.
  if (interleavedQueues !== null) {
    for (let i = 0; i < interleavedQueues.length; i++) {
      const queue = interleavedQueues[i];
      const lastInterleavedUpdate = queue.interleaved;
      if (lastInterleavedUpdate !== null) {
        queue.interleaved = null;
        const firstInterleavedUpdate = lastInterleavedUpdate.next;
        const lastPendingUpdate = queue.pending;
        if (lastPendingUpdate !== null) {
          const firstPendingUpdate = lastPendingUpdate.next;
          lastPendingUpdate.next = (firstInterleavedUpdate as any);
          lastInterleavedUpdate.next = (firstPendingUpdate as any);
        }
        queue.pending = (lastInterleavedUpdate as any);
      }
    }
    interleavedQueues = null;
  }
}
