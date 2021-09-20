import { MutableSource, MutableSourceVersion } from "../../shared/ReactTypes";
import { isPrimaryRenderer } from "./ReactFiberHostConfig";


const workInProgressSources: Array<MutableSource<any>> = [];

export function setWorkInProgressVersion(
  mutableSource: MutableSource<any>,
  version: MutableSourceVersion,
): void {
  if (isPrimaryRenderer) {
    mutableSource._workInProgressVersionPrimary = version;
  } else {
    mutableSource._workInProgressVersionSecondary = version;
  }
  workInProgressSources.push(mutableSource);
}