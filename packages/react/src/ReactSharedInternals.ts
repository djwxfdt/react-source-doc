// import assign from 'object-assign';
// import ReactCurrentDispatcher from './ReactCurrentDispatcher';
import ReactCurrentBatchConfig from './ReactCurrentBatchConfig';
import ReactCurrentActQueue from './ReactCurrentActQueue';
// import ReactCurrentOwner from './ReactCurrentOwner';
// import ReactDebugCurrentFrame from './ReactDebugCurrentFrame';

const ReactSharedInternals: Record<string, any> = {
  // ReactCurrentDispatcher,
  ReactCurrentBatchConfig,
  // ReactCurrentOwner,
  // Used by renderers to avoid bundling object-assign twice in UMD bundles:
  // assign,
};

if (__DEV__) {
  // ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
  ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
}

export default ReactSharedInternals;
