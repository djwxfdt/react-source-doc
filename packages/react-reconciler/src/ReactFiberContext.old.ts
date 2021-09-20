import checkPropTypes from "../../shared/checkPropTypes";
import invariant from "../../shared/invariant";
import { disableLegacyContext } from "../../shared/ReactFeatureFlags";
import getComponentNameFromFiber from "./getComponentNameFromFiber";
import { createCursor, pop, push, StackCursor } from "./ReactFiberStack.old";
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

const contextStackCursor: StackCursor<Object> = createCursor(
  emptyContextObject,
);


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

let previousContext: Object = emptyContextObject;

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

function cacheContext(
  workInProgress: Fiber,
  unmaskedContext: Object,
  maskedContext: Object,
): void {
  if (disableLegacyContext) {
    return;
  } else {
    const instance = workInProgress.stateNode;
    instance.__reactInternalMemoizedUnmaskedChildContext = unmaskedContext;
    instance.__reactInternalMemoizedMaskedChildContext = maskedContext;
  }
}

export function getUnmaskedContext(
  workInProgress: Fiber,
  Component: Function,
  didPushOwnContextIfProvider: boolean,
): Object {
  if (disableLegacyContext) {
    return emptyContextObject;
  } else {
    if (didPushOwnContextIfProvider && isContextProvider(Component)) {
      // If the fiber is a context provider itself, when we read its context
      // we may have already pushed its own child context on the stack. A context
      // provider should not "see" its own child context. Therefore we read the
      // previous (parent) context instead for a context provider.
      return previousContext;
    }
    return contextStackCursor.current;
  }
}

/**
 * 这个是为了兼容老版本的react的context api。新版本中返回emptyContextObject。
 * 
 * 请看这里：https://zh-hans.reactjs.org/docs/legacy-context.html（可以不看）
 */
export function getMaskedContext(
  workInProgress: Fiber,
  unmaskedContext: Record<string, any>,
): Object {
  if (disableLegacyContext) {
    return emptyContextObject;
  } else {
    const type = workInProgress.type;
    const contextTypes = type.contextTypes;
    if (!contextTypes) {
      return emptyContextObject;
    }

    // Avoid recreating masked context unless unmasked context has changed.
    // Failing to do this will result in unnecessary calls to componentWillReceiveProps.
    // This may trigger infinite loops if componentWillReceiveProps calls setState.
    const instance = workInProgress.stateNode;
    if (
      instance &&
      instance.__reactInternalMemoizedUnmaskedChildContext === unmaskedContext
    ) {
      return instance.__reactInternalMemoizedMaskedChildContext;
    }

    const context: Record<string, any> = {};
    for (const key in contextTypes) {
      context[key] = unmaskedContext[key];
    }

    if (__DEV__) {
      const name = getComponentNameFromFiber(workInProgress) || 'Unknown';
      checkPropTypes(contextTypes, context, 'context', name);
    }

    // Cache unmasked context so we can avoid recreating masked context unless necessary.
    // Context is created before the class component is instantiated so check for instance.
    if (instance) {
      cacheContext(workInProgress, unmaskedContext, context);
    }

    return context;
  }
}


export function hasContextChanged(): boolean {
  if (disableLegacyContext) {
    return false;
  } else {
    return didPerformWorkStackCursor.current;
  }
}

export function pushContextProvider(workInProgress: Fiber): boolean {
  if (disableLegacyContext) {
    return false;
  } else {
    const instance = workInProgress.stateNode;
    // We push the context as early as possible to ensure stack integrity.
    // If the instance does not exist yet, we will push null at first,
    // and replace it on the stack later when invalidating the context.
    const memoizedMergedChildContext =
      (instance && instance.__reactInternalMemoizedMergedChildContext) ||
      emptyContextObject;

    // Remember the parent context so we can merge with it later.
    // Inherit the parent's did-perform-work value to avoid inadvertently blocking updates.
    previousContext = contextStackCursor.current;
    push(contextStackCursor, memoizedMergedChildContext, workInProgress);
    push(
      didPerformWorkStackCursor,
      didPerformWorkStackCursor.current,
      workInProgress,
    );

    return true;
  }
}

export function pushTopLevelContextObject(
  fiber: Fiber,
  context: Object,
  didChange: boolean,
): void {
  if (disableLegacyContext) {
    return;
  } else {
    invariant(
      contextStackCursor.current === emptyContextObject,
      'Unexpected context found on stack. ' +
        'This error is likely caused by a bug in React. Please file an issue.',
    );

    push(contextStackCursor, context, fiber);
    push(didPerformWorkStackCursor, didChange, fiber);
  }
}


export function popContext(fiber: Fiber): void {
  if (disableLegacyContext) {
    return;
  } else {
    pop(didPerformWorkStackCursor, fiber);
    pop(contextStackCursor, fiber);
  }
}

export function popTopLevelContextObject(fiber: Fiber): void {
  if (disableLegacyContext) {
    return;
  } else {
    pop(didPerformWorkStackCursor, fiber);
    pop(contextStackCursor, fiber);
  }
}
