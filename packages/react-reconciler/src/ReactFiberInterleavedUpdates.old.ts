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