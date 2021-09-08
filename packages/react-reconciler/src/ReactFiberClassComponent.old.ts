import { Lanes } from "./ReactFiberLane.old";
import { Fiber } from "./ReactInternalTypes";




export function adoptClassInstance(workInProgress: Fiber, instance: any): void {
  // instance.updater = classComponentUpdater;
  // workInProgress.stateNode = instance;
  // // The instance needs access to the fiber so that it can schedule updates
  // setInstance(instance, workInProgress);
  // if (__DEV__) {
  //   instance._reactInternalInstance = fakeInternalInstance;
  // }
}

export function mountClassInstance(
  workInProgress: Fiber,
  ctor: any,
  newProps: any,
  renderLanes: Lanes,
): void {
  
}

export const emptyRefsObject = new React.Component().refs;
