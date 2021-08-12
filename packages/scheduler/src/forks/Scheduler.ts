import { Heap, peek, pop, push, TaskNode } from "../SchedulerMinHeap";
import { markTaskStart } from "../SchedulerProfiling";
import { IdlePriority, ImmediatePriority, LowPriority, NormalPriority, PriorityLevel, UserBlockingPriority } from "./SchedulerPriorities";


var currentPriorityLevel = NormalPriority;

/**
 * 自增id, 用于插入时候进行排序，相同优先级，先插入的先执行
 */
var taskIdCounter = 1;


/**
 * 32位系统最大整数
 */
var maxSigned31BitInt = 1073741823;

/**
 * 立即过期优先级的过期偏移量
 */
var IMMEDIATE_PRIORITY_TIMEOUT = -1;

/**
 * 用户阻塞优先级的过期偏移
 */
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;

/**
 * 普通优先级的过期偏移
 */
var NORMAL_PRIORITY_TIMEOUT = 5000;

/**
 * 低优先级的过期偏移
 */
var LOW_PRIORITY_TIMEOUT = 10000;

/**
 * 空闲优先级，永不过期
 */
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;


/**
 * 定义getCurrentTime，返回页面运行至当前时间所经过的毫秒数, 如果performance api存在，则用此api。
 * performance.now()会返回从性能测量时候开始经过的毫秒数
 */
let getCurrentTime: Function;
{
  const hasPerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';
  if (hasPerformanceNow) {
    const localPerformance = performance;
    getCurrentTime = () => localPerformance.now();
  } else {
    const localDate = Date;
    const initialTime = localDate.now();
    getCurrentTime = () => localDate.now() - initialTime;
  }
}

/**
 * 这个语句毫无意义！设置成null干啥，调用的时候又不判空, 估计是为了兼容不同平台，但又没写完
 */
const localClearTimeout = typeof clearTimeout === 'function' ? clearTimeout : null;
const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;

/**
 * 是否由回调函数调度
 */
var isHostCallbackScheduled = false;

/**
 * 是否有定时调度任务在跑
 */
var isHostTimeoutScheduled = false;

let taskTimeoutID: number | undefined = -1;


/**
 * 是否正在执行任务，防止重入
 */
var isPerformingWork = false;


/**
 * 小顶堆，保存将要执行的调度任务
 */
const taskQueue: Heap = [];

/**
 * 小顶堆，保存延迟执行的调度任务
 */
const timerQueue: Heap = [];

/**
 * clearTimeout
 */
function cancelHostTimeout() {
  localClearTimeout?.(taskTimeoutID);
  taskTimeoutID = -1;
}

/**
 * setTimeout
 */
function requestHostTimeout(callback: Function, ms: number) {
  taskTimeoutID = localSetTimeout?.(() => {
    callback(getCurrentTime());
  }, ms);
}


/**
 * 检查延迟队列中的任务，如果已经过期，则将任务移除延迟任务队列，并放入过期任务队列
 */
function advanceTimers(currentTime: number) {
  let timer = peek(timerQueue);
  while (timer !== null) {
    if (timer.callback === null) {
      /**
       * 当前任务已被取消
       */
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
      if (enableProfiling) {
        markTaskStart(timer, currentTime);
        timer.isQueued = true;
      }
    } else {
      return;
    }
    timer = peek(timerQueue);
  }
}

/**
 * 当延迟任务的时间到了
 */
function handleTimeout(currentTime: number) {
  isHostTimeoutScheduled = false;
  advanceTimers(currentTime);

  if (!isHostCallbackScheduled) {
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    } else {
      const firstTimer = peek(timerQueue);
      if (firstTimer !== null) {
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}

function unstable_runWithPriority(priorityLevel: PriorityLevel, eventHandler: Function) {

  /**
   * 这里实际上只是做了一个兜底，检查传进来的值是否是合法优先级
   */
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  /**
   * 保存当前优先级
   */
  const previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    /**
     * 执行调度任务
     */
    return eventHandler();
  } finally {
    /**
     * 恢复当前优先级
     */
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_scheduleCallback(priorityLevel: PriorityLevel, callback: Function, options?: {delay: number} | number | null) {
  
  /**
   * 获得当前时间点
   */
  var currentTime = getCurrentTime();

  /**
   * 设置任务的预期执行时间，如果没传delay,则代表立即执行
   */
  var startTime;
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  /**
   * 根据传入的优先级，设置任务的过期时间
   */
  var timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }
  var expirationTime = startTime + timeout;

  /**
   * 创建一个新的调度任务
   */
  var newTask: TaskNode  = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };

  /**
   * 调试时候用的
   */
  if (enableProfiling) {
    newTask.isQueued = false;
  }

  /**
   * 1. 如果是立即执行任务，startTime和currentTime相等，执行else语句，并将调度任务存入小顶堆
   * 此时将过期时间设置为排序的依据，过期时间越小，越靠前
   * 2. 如果是延迟任务，则 starTime小于currentTime。执行if语句
   * 此时预期执行时间被设置为排序的依据，预期执行时间点越小越靠前
   */
   if (startTime > currentTime) {
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
    /**
     * 如果当前优先级最高的任务恰恰是刚创建的任务，则重新调整定时器的时间
     */
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      if (isHostTimeoutScheduled) {
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // 启动定时器
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    if (enableProfiling) {
      markTaskStart(newTask, currentTime);
      newTask.isQueued = true;
    }
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }
}