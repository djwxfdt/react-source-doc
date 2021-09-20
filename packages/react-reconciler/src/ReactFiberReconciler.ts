import { enableNewReconciler } from "../../shared/ReactFeatureFlags";

/**
 * 这里我们直接采用目前生效的版本
 */

import {
  createContainer as createContainer_old,
  updateContainer as updateContainer_old,
  findHostInstanceWithNoPortals as findHostInstanceWithNoPortals_old,
  getPublicRootInstance as getPublicRootInstance_old,
  flushSyncWithoutWarningIfAlreadyRendering as flushSyncWithoutWarningIfAlreadyRendering_old
} from './ReactFiberReconciler.old'

export const createContainer = createContainer_old;

export const updateContainer = updateContainer_old;

export const findHostInstanceWithNoPortals = findHostInstanceWithNoPortals_old;

export const getPublicRootInstance = getPublicRootInstance_old;

export const flushSyncWithoutWarningIfAlreadyRendering = flushSyncWithoutWarningIfAlreadyRendering_old;



