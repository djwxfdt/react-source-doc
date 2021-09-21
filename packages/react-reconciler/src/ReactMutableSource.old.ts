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

export function resetWorkInProgressVersions(): void {
  for (let i = 0; i < workInProgressSources.length; i++) {
    const mutableSource = workInProgressSources[i];
    if (isPrimaryRenderer) {
      mutableSource._workInProgressVersionPrimary = null;
    } else {
      mutableSource._workInProgressVersionSecondary = null;
    }
  }
  workInProgressSources.length = 0;
}