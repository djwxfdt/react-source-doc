import { ReactNodeList } from "../../shared/ReactTypes";
import { FiberRoot } from "./ReactInternalTypes";

export const isDevToolsPresent = typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';


/**
 * TODO
 */
export function onScheduleRoot(root: FiberRoot, children: ReactNodeList) {
  
}