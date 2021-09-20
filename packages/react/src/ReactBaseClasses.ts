import ReactNoopUpdateQueue from "./ReactNoopUpdateQueue";

const emptyObject = {};
if (__DEV__) {
  Object.freeze(emptyObject);
}

export function Component(this: any, props?: any, context?: any, updater?: any): any {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  // We initialize the default updater but the real one gets injected by the
  // renderer.
  this.updater = updater || ReactNoopUpdateQueue;
}

Component.prototype.isReactComponent = {};