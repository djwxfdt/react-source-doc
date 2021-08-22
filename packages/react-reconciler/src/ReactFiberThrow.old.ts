import type {Fiber} from './ReactInternalTypes';
import type {FiberRoot} from './ReactInternalTypes';
import {includesSomeLane, Lane, Lanes, NoTimestamp, SyncLane} from './ReactFiberLane.old';
import type {CapturedValue} from './ReactCapturedValue';
import {CaptureUpdate, createUpdate, Update} from './ReactUpdateQueue.old';
import { markLegacyErrorBoundaryAsFailed, onUncaughtError } from './ReactFiberWorkLoop.old';
import {logCapturedError} from './ReactFiberErrorLogger'
import { markFailedErrorBoundaryForHotReloading } from './ReactFiberHotReloading.old';
import getComponentNameFromFiber from './getComponentNameFromFiber';

export function createRootErrorUpdate(
  fiber: Fiber,
  errorInfo: CapturedValue<any>,
  lane: Lane,
): Update<any> {
  const update = createUpdate(NoTimestamp, lane);
  // Unmount the root by rendering null.
  update.tag = CaptureUpdate;
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = {element: null};
  const error = errorInfo.value;
  update.callback = () => {
    onUncaughtError(error);
    logCapturedError(fiber, errorInfo);
  };
  return update;
}

export function createClassErrorUpdate(
  fiber: Fiber,
  errorInfo: CapturedValue<mixed>,
  lane: Lane,
): Update<mixed> {
  const update = createUpdate(NoTimestamp, lane);
  update.tag = CaptureUpdate;
  const getDerivedStateFromError = fiber.type.getDerivedStateFromError;
  if (typeof getDerivedStateFromError === 'function') {
    const error = errorInfo.value;
    update.payload = () => {
      return getDerivedStateFromError(error);
    };
    update.callback = () => {
      if (__DEV__) {
        markFailedErrorBoundaryForHotReloading(fiber);
      }
      logCapturedError(fiber, errorInfo);
    };
  }

  const inst = fiber.stateNode;
  if (inst !== null && typeof inst.componentDidCatch === 'function') {
    update.callback = function callback() {
      if (__DEV__) {
        markFailedErrorBoundaryForHotReloading(fiber);
      }
      logCapturedError(fiber, errorInfo);
      if (typeof getDerivedStateFromError !== 'function') {
        // To preserve the preexisting retry behavior of error boundaries,
        // we keep track of which ones already failed during this batch.
        // This gets reset before we yield back to the browser.
        // TODO: Warn in strict mode if getDerivedStateFromError is
        // not defined.
        markLegacyErrorBoundaryAsFailed(this);
      }
      const error = errorInfo.value;
      const stack = errorInfo.stack;
      (this as any).componentDidCatch(error, {
        componentStack: stack !== null ? stack : '',
      });
      if (__DEV__) {
        if (typeof getDerivedStateFromError !== 'function') {
          // If componentDidCatch is the only error boundary method defined,
          // then it needs to call setState to recover from errors.
          // If no state update is scheduled then the boundary will swallow the error.
          if (!includesSomeLane(fiber.lanes, SyncLane)) {
            console.error(
              '%s: Error boundaries should implement getDerivedStateFromError(). ' +
                'In that method, return a state update to display an error message or fallback UI.',
              getComponentNameFromFiber(fiber) || 'Unknown',
            );
          }
        }
      }
    };
  }
  return update;
}