import { enableNewReconciler } from "../../shared/ReactFeatureFlags";

/**
 * 这里我们直接采用目前生效的版本
 */

import {
  createContainer as createContainer_old,
} from './ReactFiberReconciler.old'

export const createContainer = createContainer_old;