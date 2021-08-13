import { enableProfiling } from "./SchedulerFeatureFlags";
import { PriorityLevel } from "./SchedulerPriorities";

/**
 * 这里是关于性能监控的一些日志信息
 */

const TaskStartEvent = 1;
const TaskCompleteEvent = 2;
const TaskErrorEvent = 3;
const TaskCancelEvent = 4;
const TaskRunEvent = 5;
const TaskYieldEvent = 6;
const SchedulerSuspendEvent = 7;
const SchedulerResumeEvent = 8;


let eventLog: Int32Array | null = null;
let eventLogIndex = 0;
let eventLogSize = 0;
let eventLogBuffer: ArrayBuffer | null = null;

let mainThreadIdCounter: number = 0;

let runIdCounter: number = 0;


const MAX_EVENT_LOG_SIZE = 524288; // Equivalent to 2 megabytes

export function stopLoggingProfilingEvents(): ArrayBuffer | null {
  const buffer = eventLogBuffer;
  eventLogSize = 0;
  eventLogBuffer = null;
  eventLog = null;
  eventLogIndex = 0;
  return buffer;
}

/**
 * 一顿花里胡哨的操作，实际就是把日志信息放入数组
 */
function logEvent(entries: number[]) {
  if (eventLog !== null) {
    const offset = eventLogIndex;
    eventLogIndex += entries.length;
    if (eventLogIndex + 1 > eventLogSize) {
      eventLogSize *= 2;
      if (eventLogSize > MAX_EVENT_LOG_SIZE) {
        // Using console['error'] to evade Babel and ESLint
        console['error'](
          "Scheduler Profiling: Event log exceeded maximum size. Don't " +
            'forget to call `stopLoggingProfilingEvents()`.',
        );
        stopLoggingProfilingEvents();
        return;
      }
      const newEventLog = new Int32Array(eventLogSize * 4);
      newEventLog.set(eventLog);
      eventLogBuffer = newEventLog.buffer;
      eventLog = newEventLog;
    }
    eventLog.set(entries, offset);
  }
}


export function markTaskStart<T extends {
  id: number,
  priorityLevel: PriorityLevel,
}>(
  task: T ,
  ms: number,
) {
  if (enableProfiling) {
    if (eventLog !== null) {
      // performance.now returns a float, representing milliseconds. When the
      // event is logged, it's coerced to an int. Convert to microseconds to
      // maintain extra degrees of precision.
      logEvent([TaskStartEvent, ms * 1000, task.id, task.priorityLevel]);
    }
  }
}

/**
 * 调度开始启动日志
 */
export function markSchedulerUnsuspended(ms: number) {
  if (enableProfiling) {
    if (eventLog !== null) {
      logEvent([SchedulerResumeEvent, ms * 1000, mainThreadIdCounter]);
    }
  }
}

/**
 * 调度出错日志
 */
export function markTaskErrored<T extends {
  id: number,
  priorityLevel: PriorityLevel,
}>(
  task: T ,
  ms: number,
) {
  if (enableProfiling) {
    if (eventLog !== null) {
      logEvent([TaskErrorEvent, ms * 1000, task.id]);
    }
  }
}

/**
 * 调度暂停日志
 */
export function markSchedulerSuspended(ms: number) {
  if (enableProfiling) {
    mainThreadIdCounter++;

    if (eventLog !== null) {
      logEvent([SchedulerSuspendEvent, ms * 1000, mainThreadIdCounter]);
    }
  }
}

/**
 * 任务开始执行日志
 */
export function markTaskRun<T extends {
  id: number,
  priorityLevel: PriorityLevel,
}>(
  task: T,
  ms: number,
) {
  if (enableProfiling) {
    runIdCounter++;

    if (eventLog !== null) {
      logEvent([TaskRunEvent, ms * 1000, task.id, runIdCounter]);
    }
  }
}

/**
 * 任务存在链式调用，让出执行，准备下次的执行
 */
export function markTaskYield<T extends {
  id: number,
}>(task: T, ms: number) {
  if (enableProfiling) {
    if (eventLog !== null) {
      logEvent([TaskYieldEvent, ms * 1000, task.id, runIdCounter]);
    }
  }
}

/**
 * 任务执行完毕的日志
 */
export function markTaskCompleted<T extends {
  id: number,
}>(
  task: T,
  ms: number,
) {
  if (enableProfiling) {
    if (eventLog !== null) {
      logEvent([TaskCompleteEvent, ms * 1000, task.id]);
    }
  }
}