import { PriorityLevel } from "./forks/SchedulerPriorities";


const TaskStartEvent = 1;

let eventLog: Int32Array | null = null;
let eventLogIndex = 0;
let eventLogSize = 0;
let eventLogBuffer: ArrayBuffer | null = null;

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