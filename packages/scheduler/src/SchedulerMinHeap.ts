import { PriorityLevel } from "./forks/SchedulerPriorities";


export type TaskNode = {
  id: number,
  sortIndex: number,
  priorityLevel: PriorityLevel
  startTime: number,
  expirationTime: number,
  isQueued?: boolean
  callback: Function | null
};

export type Heap = Array<TaskNode>;


function compare(a: TaskNode, b: TaskNode) {
  // Compare sort index first, then task id.
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}

/**
 * 堆失衡，需要重新调整失衡节点，向上冒
 */
function siftUp(heap: Heap, node: TaskNode, i: number) {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1;
    const parent = heap[parentIndex];
    if (compare(parent, node) > 0) {
      // The parent is larger. Swap positions.
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      // The parent is smaller. Exit.
      return;
    }
  }
}

/**
 * 堆整体失衡，需要重新调整失衡节点，向下检查
 */
function siftDown(heap: Heap, node: TaskNode, i: number) {
  let index = i;
  const length = heap.length;
  const halfLength = length >>> 1;
  while (index < halfLength) {
    const leftIndex = (index + 1) * 2 - 1;
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex];

    // If the left or right node is smaller, swap with the smaller of those.
    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      // Neither child is smaller. Exit.
      return;
    }
  }
}

/**
 * 将任务压入小顶堆
 * 小顶堆是二叉树结构，越靠近根越小
 */
export function push(heap: Heap, node: TaskNode): void {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}

/**
 * 从顶部取出一个值最小的任务
 */
export function pop(heap: Heap): TaskNode | null {
  if (heap.length === 0) {
    return null;
  }
  const first = heap[0];
  const last = heap.pop()!;
  if (last !== first) {
    heap[0] = last;
    siftDown(heap, last, 0);
  }
  return first;
}

/**
 * 获取顶点的任务，即优先级最高的任务
 */
export function peek(heap: Heap): TaskNode | null {
  return heap.length === 0 ? null : heap[0];
}