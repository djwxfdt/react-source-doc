import { ReactNodeList } from "../../shared/ReactTypes";
import { FiberRoot } from "./ReactInternalTypes";

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
