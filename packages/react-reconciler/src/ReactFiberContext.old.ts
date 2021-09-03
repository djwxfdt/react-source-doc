import checkPropTypes from "../../shared/checkPropTypes";
import { disableLegacyContext } from "../../shared/ReactFeatureFlags";
import getComponentNameFromFiber from "./getComponentNameFromFiber";
import { createCursor, StackCursor } from "./ReactFiberStack.old";
import { Fiber } from "./ReactInternalTypes";
import { ClassComponent, HostRoot } from "./ReactWorkTags";

const didPerformWorkStackCursor: StackCursor<boolean> = createCursor(false);

let warnedAboutMissingGetChildContext: any;

if (__DEV__) {
  warnedAboutMissingGetChildContext = {};
}


export const emptyContextObject = {};
if (__DEV__) {
  Object.freeze(emptyContextObject);
}

/**
 * 判断当前组件是否是ContextProvider
 */
export function isContextProvider(type: any): boolean {
  if (disableLegacyContext) {
    /**
     * 不用担心，这里不会走，永为false
     */
    return false;
  } else {
    const childContextTypes = type.childContextTypes;
    return childContextTypes !== null && childContextTypes !== undefined;
  }
}


/**
 * 从下往上找到最近的ContextProvider，并返回当前merge过后的context值
 */
export function findCurrentUnmaskedContext(fiber: Fiber): any {
  if (disableLegacyContext) {
    /**
     * 不用担心，这里不会走，永为false
     */
    return emptyContextObject;
  } else {
    // Currently this is only used with renderSubtreeIntoContainer; not sure if it
    // makes sense elsewhere
    // invariant(
    //   isFiberMounted(fiber) && fiber.tag === ClassComponent,
    //   'Expected subtree parent to be a mounted class component. ' +
    //     'This error is likely caused by a bug in React. Please file an issue.',
    // );

    /**
     * 从下往上找到最近的ContextProvider，并返回当前merge过后的context值
     */
    let node: Fiber | null = fiber;
    do {
      switch (node.tag) {
        case HostRoot:
          return node.stateNode.context;
        case ClassComponent: {
          const Component = node.type;
          if (isContextProvider(Component)) {
            return node.stateNode.__reactInternalMemoizedMergedChildContext;
          }
          break;
        }
      }
      node = node.return;
    } while (node !== null);
    // invariant(
    //   false,
    //   'Found unexpected detached subtree parent. ' +
    //     'This error is likely caused by a bug in React. Please file an issue.',
    // );
  }
}


export function processChildContext(
  fiber: Fiber,
  type: any,
  parentContext: Object,
): Object {
  if (disableLegacyContext) {
    return parentContext;
  } else {
    const instance = fiber.stateNode;
    const childContextTypes = type.childContextTypes;

    // TODO (bvaughn) Replace this behavior with an invariant() in the future.
    // It has only been added in Fiber to match the (unintentional) behavior in Stack.
    if (typeof instance.getChildContext !== 'function') {
      if (__DEV__) {
        const componentName = getComponentNameFromFiber(fiber) || 'Unknown';

        if (!warnedAboutMissingGetChildContext[componentName]) {
          warnedAboutMissingGetChildContext[componentName] = true;
          console.error(
            '%s.childContextTypes is specified but there is no getChildContext() method ' +
              'on the instance. You can either define getChildContext() on %s or remove ' +
              'childContextTypes from it.',
            componentName,
            componentName,
          );
        }
      }
      return parentContext;
    }

    const childContext = instance.getChildContext();
    for (const contextKey in childContext) {
      // invariant(
      //   contextKey in childContextTypes,
      //   '%s.getChildContext(): key "%s" is not defined in childContextTypes.',
      //   getComponentNameFromFiber(fiber) || 'Unknown',
      //   contextKey,
      // );
    }
    if (__DEV__) {
      const name = getComponentNameFromFiber(fiber) || 'Unknown';
      checkPropTypes(childContextTypes, childContext, 'child context', name);
    }

    return {...parentContext, ...childContext};
  }
}

export function hasContextChanged(): boolean {
  if (disableLegacyContext) {
    return false;
  } else {
    return didPerformWorkStackCursor.current;
  }
}