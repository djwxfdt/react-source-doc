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
   * 计算任务的过期时间，如果没传delay,则代表立即过期
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

  var newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };

}