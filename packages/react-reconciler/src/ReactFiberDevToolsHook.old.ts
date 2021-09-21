import { enableProfilerTimer } from "../../shared/ReactFeatureFlags";
import { ReactNodeList } from "../../shared/ReactTypes";
import { EventPriority, DiscreteEventPriority, ContinuousEventPriority, DefaultEventPriority, IdleEventPriority } from "./ReactEventPriorities.old";
import { DidCapture } from "./ReactFiberFlags";
import { FiberRoot } from "./ReactInternalTypes";

import {
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority,
} from './Scheduler';

let rendererID:any = null;
let injectedHook: any = null;
let hasLoggedError = false;

export const isDevToolsPresent = typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';


/**
 * TODO
 */
export function onScheduleRoot(root: FiberRoot, children: ReactNodeList) {
  
}

export function onPostCommitRoot(root: FiberRoot) {
  if (
    injectedHook &&
    typeof injectedHook.onPostCommitFiberRoot === 'function'
  ) {
    try {
      injectedHook.onPostCommitFiberRoot(rendererID, root);
    } catch (err) {
      if (__DEV__) {
        if (!hasLoggedError) {
          hasLoggedError = true;
          console.error('React instrumentation encountered an error: %s', err);
        }
      }
    }
  }
}


export function onCommitRoot(root: FiberRoot, eventPriority: EventPriority) {
  if (injectedHook && typeof injectedHook.onCommitFiberRoot === 'function') {
    try {
      const didError = (root.current!.flags & DidCapture) === DidCapture;
      if (enableProfilerTimer) {
        let schedulerPriority;
        switch (eventPriority) {
          case DiscreteEventPriority:
            schedulerPriority = ImmediateSchedulerPriority;
            break;
          case ContinuousEventPriority:
            schedulerPriority = UserBlockingSchedulerPriority;
            break;
          case DefaultEventPriority:
            schedulerPriority = NormalSchedulerPriority;
            break;
          case IdleEventPriority:
            schedulerPriority = IdleSchedulerPriority;
            break;
          default:
            schedulerPriority = NormalSchedulerPriority;
            break;
        }
        injectedHook.onCommitFiberRoot(
          rendererID,
          root,
          schedulerPriority,
          didError,
        );
      } else {
        injectedHook.onCommitFiberRoot(rendererID, root, undefined, didError);
      }
    } catch (err) {
      if (__DEV__) {
        if (!hasLoggedError) {
          hasLoggedError = true;
          console.error('React instrumentation encountered an error: %s', err);
        }
      }
    }
  }
}

