import { Heap, peek, pop, push, TaskNode } from "../SchedulerMinHeap";
import { markSchedulerSuspended, markSchedulerUnsuspended, markTaskCanceled, markTaskCompleted, markTaskErrored, markTaskRun, markTaskStart, markTaskYield } from "../SchedulerProfiling";
import { enableIsInputPending, enableProfiling, enableSchedulerDebugging } from "../SchedulerFeatureFlags";
import { IdlePriority, ImmediatePriority, LowPriority, NormalPriority, PriorityLevel, UserBlockingPriority } from "../SchedulerPriorities";


let currentPriorityLevel = NormalPriority;

function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel;
}

/**
 * 自增id, 用于插入时候进行排序，相同优先级，先插入的先执行
 */
let taskIdCounter = 1;


/**
 * 32位系统最大整数
 */
let maxSigned31BitInt = 1073741823;

/**
 * 立即过期优先级的过期偏移量
 */
let IMMEDIATE_PRIORITY_TIMEOUT = -1;

/**
 * 用户阻塞优先级的过期偏移
 */
let USER_BLOCKING_PRIORITY_TIMEOUT = 250;

/**
 * 普通优先级的过期偏移
 */
let NORMAL_PRIORITY_TIMEOUT = 5000;

/**
 * 低优先级的过期偏移
 */
let LOW_PRIORITY_TIMEOUT = 10000;

/**
 * 空闲优先级，永不过期
 */
let IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;


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
 * 这里防止这几个native api被一些polyfill库重写掉，从而造成执行出问题，但我觉得如果polyfill在之前执行依然会有问题
 */
const localClearTimeout = typeof clearTimeout === 'function' ? clearTimeout : null;
/**
 * 就是setTimeout
 */
const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;

/**
 * 只有nodejs, ie和jsdom支持这个方法
 * setImmediate 是宏任务, 在事件循环的check阶段执行。如果在timer阶段执行的，就会在本轮执行。不然会在下个循环
 */
const localSetImmediate = typeof setImmediate !== 'undefined' ? setImmediate : null;


/**
 * 正在执行的任务
 */
let currentTask: TaskNode | null = null;

/**
 * 是否执行了pause
 */
let isSchedulerPaused = false;


/**
 * 是否由回调函数调度
 */
let isHostCallbackScheduled = false;

/**
 * 是否有定时调度任务在跑
 */
let isHostTimeoutScheduled = false;

let taskTimeoutID: number | undefined = -1;

/**
 * 执行requestHostCallback之后设置的全局变量，在setImmediate之类的回调中将被调用
 */
let scheduledHostCallback: Function | null = null;

/**
 * 当前是否有批量任务正在执行
 */
let isMessageLoopRunning = false;

/**
 * 是否正在执行任务，防止重入
 */
let isPerformingWork = false;


/**
 * 小顶堆，保存将要执行的调度任务
 */
const taskQueue: Heap = [];

/**
 * 小顶堆，保存延迟执行的调度任务
 */
const timerQueue: Heap = [];

/**
 * 每执行一段时间挂起一次，来让出执行给主线程，比如用户事件。
 */
let yieldInterval = 5;

const maxYieldInterval = 300;


/**
 * 需要被挂起的时间点
 */
let deadline = 0;

/**
 * 由外部调用设置的标记，在批量调度时判断是否有要中止调度
 */
let needsPaint = false;


function unstable_cancelCallback(task: TaskNode) {
  if (enableProfiling) {
    if (task.isQueued) {
      const currentTime = getCurrentTime();
      markTaskCanceled(task, currentTime);
      task.isQueued = false;
    }
  }

  // Null out the callback to indicate the task has been canceled. (Can't
  // remove from the queue because you can't remove arbitrary nodes from an
  // array based heap, only the first one.)
  task.callback = null;
}

/**
 * 执行回调任务，直至到deadline
 */
const performWorkUntilDeadline = () => {
  /**
   * 就是requestHostCallback传进来的回调参数，保存到了全局
   */
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    deadline = currentTime + yieldInterval;
    const hasTimeRemaining = true;
    let hasMoreWork = true;
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline!();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
  needsPaint = false;
}

/**
 * 调度管理时间大师
 */
let schedulePerformWorkUntilDeadline: Function | undefined;

/**
 * 优先选用setImmediate方法，原因有一些，总结不出来，可能更简洁，原生支持，不需要投机
 */
if (typeof localSetImmediate === 'function') {
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  /**
   * 为什么选用MessageChannel？因为浏览器针对setTimeout有clamping，即使你设置成0ms，实际执行的时候也是在5-10ms左右
   */
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // 如果你前两个都不支持，那..好自为之
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout?.(performWorkUntilDeadline, 0);
  };
}

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
  }, ms) as any;
}

/**
 * 检测是否需要暂停任务调度，将执行环境交给主线程执行，以期获得更好的交互性能
 */
function shouldYieldToHost() {
  if (
    enableIsInputPending &&
    navigator !== undefined &&
    navigator.scheduling !== undefined &&
    navigator.scheduling.isInputPending !== undefined
  ) {
    const scheduling = navigator.scheduling;
    const currentTime = getCurrentTime();
    if (currentTime >= deadline) {
      if (needsPaint || scheduling.isInputPending!()) {
        /**
         * 如果needsPaint为true，或者存在input活动，就返回true
         */
        return true;
      }
      /**
       * 如果不存在上面的情况，则表明浏览器这时候还很空闲，可以继续执行一段时间。
       * 但是不能一直执行下去，最高执行300ms，以防止万一有啥考虑不周的还能交出执行权
       */
      const timeElapsed = currentTime - (deadline - yieldInterval);
      return timeElapsed >= maxYieldInterval;
    } else {
      return false;
    }
  } else {
    /**
     * 如果不存在 isInputPending 方法，则简单的判断是否已经执行操作5ms了。超过就退出调度循环
     */
    return getCurrentTime() >= deadline;
  }
}

/**
 * 开始批量执行调度任务
 * 
 * 如果当前过期任务队列全部被处理完了，就会检测延时任务队列，并开启定时器（只有这里会有异步）
 * 
 * 这里返回的true和false没什么用，没人在意
 */
function workLoop(hasTimeRemaining: boolean, initialTime: number) {
  let currentTime = initialTime;
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);
  while (
    currentTask !== null &&
    /**
     * 如果调度被暂停了，那肯定不能开始调度任务
     */
    !(enableSchedulerDebugging && isSchedulerPaused)
  ) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // 这时候任务还没过期，但是已经没时间给你调度了。
      break;
    }
    const callback = currentTask.callback;
    /**
     * 如果任务被取消了，callback可能为null
     */
    if (typeof callback === 'function') {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      if (enableProfiling) {
        markTaskRun(currentTask, currentTime);
      }
      
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      /**
       * 任务执行完之后还存在后续的任务需要执行，将当前任务的回调设置为后续任务的回调，等待下次执行
       */
      if (typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback;
        if (enableProfiling) {
          markTaskYield(currentTask, currentTime);
        }
      } else {
        if (enableProfiling) {
          markTaskCompleted(currentTask, currentTime);
          currentTask.isQueued = false;
        }
        /**
         * 弹出已被执行的任务
         */
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      /**
       * 每次执行完一次任务都检查一下有没有延时任务到点了，到点了得让他执行
       */
      advanceTimers(currentTime);
    } else {
      pop(taskQueue);
    }
    currentTask = peek(taskQueue);
  }
  
  /**
   * 检查跳出循环之后，是否还有任务还未执行
   */
  if (currentTask !== null) {
    return true;
  } else {
    const firstTimer = peek(timerQueue);
    /**
     * 如果没有则先检查有没有延时任务，没有就return，有的话继续开启定时器
     */
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}

/**
 * 冲洗当前任务队列
 * 
 * requestHostCallback的回调函数
 * 
 * 返回的true和false实际上没什么用
 */
function flushWork(hasTimeRemaining: boolean, initialTime: number) {
  if (enableProfiling) {
    markSchedulerUnsuspended(initialTime);
  }

  // 设置当前不存在调度回调的标记
  isHostCallbackScheduled = false;
  if (isHostTimeoutScheduled) {
    /**
     * 清除延时任务检测的定时器，因为已经在调度了，workloop执行完会重新开启
     */
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  /**
   * 设置当前正在执行冲洗任务的标记
   */
  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  try {
    if (enableProfiling) {
      try {
        return workLoop(hasTimeRemaining, initialTime);
      } catch (error) {
        if (currentTask !== null) {
          const currentTime = getCurrentTime();
          markTaskErrored(currentTask, currentTime);
          currentTask.isQueued = false;
        }
        throw error;
      }
    } else {
      // 所以上面的if不用在意，这里只有这么一句.
      return workLoop(hasTimeRemaining, initialTime);
    }
  } finally {
    /**
     * 恢复执行上下文
     */
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
    if (enableProfiling) {
      const currentTime = getCurrentTime();
      markSchedulerSuspended(currentTime);
    }
  }
}

/**
 * 在下一次任务执行时机（宏任务）执行回调
 */
function requestHostCallback(callback: Function) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline!();
  }
}

/**
 * 检查延迟队列中的任务，如果已经过期，则将任务移除延迟任务队列，并放入过期任务队列
 * 
 * 里面不存在异步操作，放心
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

  /**
   * 如果当前不存在正在调度的任务
   */
  if (!isHostCallbackScheduled) {
    /**
     * 一般情况下advanceTimers执行完成之后，taskQueue里面会有任务
     */
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

/**
 * TODO
 */
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

/**
 * 创建一个调度任务，如果当前没有在执行调度或执行任务，则启动调度流程
 *
 *  代码里面简单来说，就是：
 * 1. 根据参数，创建延迟任务或者立即执行任务。延迟任务放入延时队列，立即执行任务放入过期任务队列
 * 2. 执行调度
 */
function unstable_scheduleCallback(priorityLevel: PriorityLevel, callback: Function, options?: {delay: number} | number | null) {
  
  /**
   * 获得当前时间点
   */
  let currentTime = getCurrentTime();

  /**
   * 设置任务的预期执行时间，如果没传delay,则代表立即执行
   */
  let startTime;
  if (typeof options === 'object' && options !== null) {
    let delay = options.delay;
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
  let timeout;
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
  let expirationTime = startTime + timeout;

  /**
   * 创建一个新的调度任务
   */
  let newTask: TaskNode  = {
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
   
    /**
     * 如果没有任务正在调度，并且没有任务正在执行，则启动任务调度逻辑
     */
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }
}


function requestPaint() {
  if (
    enableIsInputPending &&
    navigator !== undefined &&
    navigator.scheduling !== undefined &&
    navigator.scheduling.isInputPending !== undefined
  ) {
    needsPaint = true;
  }

  // Since we yield every frame regardless, `requestPaint` has no effect.
}

const unstable_requestPaint = requestPaint;


export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority,
  LowPriority as unstable_LowPriority,

  unstable_cancelCallback,
  unstable_runWithPriority,
  unstable_scheduleCallback,
  shouldYieldToHost as unstable_shouldYield,
  getCurrentTime as unstable_now,

  unstable_getCurrentPriorityLevel,
  unstable_requestPaint
};