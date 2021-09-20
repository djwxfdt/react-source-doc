import type { ReactNodeList } from '../../shared/ReactTypes';
import {
  getIteratorFn,
  REACT_ELEMENT_TYPE,
  REACT_PORTAL_TYPE,
} from '../../shared/ReactSymbols';
import isArray from '../../shared/isArray';
import invariant from '../../shared/invariant';

import { isValidElement, cloneAndReplaceKey } from './ReactElement';

const SEPARATOR = '.';
const SUBSEPARATOR = ':';

type ForEachFunc = (child?: React$Node) => void;

type MapFunc = (child?: React$Node, count?: number) => ReactNodeList | undefined;

/**
 * TODO: Test that a single child and an array with one item have the same key
 * pattern.
 */

let didWarnAboutMaps = false;

const userProvidedKeyEscapeRegex = /\/+/g;
function escapeUserProvidedKey(text: string): string {
  return text.replace(userProvidedKeyEscapeRegex, '$&/');
}

/**
 * Generate a key string that identifies a element within a set.
 *
 * @param {*} element A element that could contain a manual key.
 * @param {number} index Index that is used if a manual key is not provided.
 * @return {string}
 */
function getElementKey(element: any, index: number): string {
  // Do some typechecking here since we call this blindly. We want to ensure
  // that we don't block potential future ES APIs.
  if (typeof element === 'object' && element !== null && element.key != null) {
    // Explicit key
    return escape('' + element.key);
  }
  // Implicit key determined by the index in the set
  return index.toString(36);
}

/**
 * 
 */
function mapIntoArray(
  children: ReactNodeList | undefined,
  array: Array<React$Node>,
  escapedPrefix: string,
  nameSoFar: string,
  callback: (reactNode?: React$Node) => ReactNodeList | undefined,
): number {
  const type = typeof children;

  if (type === 'undefined' || type === 'boolean') {
    // All of the above are perceived as null.
    children = null;
  }

  let invokeCallback = false;

  if (children === null) {
    invokeCallback = true;
  } else {
    switch (type) {
      case 'string':
      case 'number':
        invokeCallback = true;
        break;
      case 'object':
        switch (children.$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = true;
        }
    }
  }

  if (invokeCallback) {
    const child = children;
    let mappedChild = callback(child);
    // If it's the only child, treat the name as if it was wrapped in an array
    // so that it's consistent if the number of children grows:
    const childKey =
      nameSoFar === '' ? SEPARATOR + getElementKey(child, 0) : nameSoFar;
    if (isArray(mappedChild)) {
      let escapedChildKey = '';
      if (childKey != null) {
        escapedChildKey = escapeUserProvidedKey(childKey) + '/';
      }
      mapIntoArray(mappedChild, array, escapedChildKey, '', c => c);
    } else if (mappedChild != null) {
      if (isValidElement(mappedChild)) {
        mappedChild = cloneAndReplaceKey(
          mappedChild,
          // Keep both the (mapped) and old keys if they differ, just as
          // traverseAllChildren used to do for objects as children
          escapedPrefix +
            // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
            (mappedChild.key && (!child || child.key !== mappedChild.key)
              ? // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                escapeUserProvidedKey('' + mappedChild.key) + '/'
              : '') +
            childKey,
        );
      }
      array.push(mappedChild);
    }
    return 1;
  }

  let child;
  let nextName;
  let subtreeCount = 0; // Count of children found in the current subtree.
  const nextNamePrefix =
    nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

  if (isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      child = children[i];
      nextName = nextNamePrefix + getElementKey(child, i);
      subtreeCount += mapIntoArray(
        child,
        array,
        escapedPrefix,
        nextName,
        callback,
      );
    }
  } else {
    const iteratorFn = getIteratorFn(children);
    if (typeof iteratorFn === 'function') {
      const iterableChildren: Iterable<React$Node> & {
        entries: any,
      } = (children as any);

      if (__DEV__) {
        // Warn about using Maps as children
        if (iteratorFn === iterableChildren.entries) {
          if (!didWarnAboutMaps) {
            console.warn(
              'Using Maps as children is not supported. ' +
                'Use an array of keyed ReactElements instead.',
            );
          }
          didWarnAboutMaps = true;
        }
      }

      const iterator = iteratorFn.call(iterableChildren);
      let step;
      let ii = 0;
      while (!(step = iterator.next()).done) {
        child = step.value;
        nextName = nextNamePrefix + getElementKey(child, ii++);
        subtreeCount += mapIntoArray(
          child,
          array,
          escapedPrefix,
          nextName,
          callback,
        );
      }
    } else if (type === 'object') {
      const childrenString = '' + children as any;
      invariant(
        false,
        'Objects are not valid as a React child (found: %s). ' +
          'If you meant to render a collection of children, use an array ' +
          'instead.',
        childrenString === '[object Object]'
          ? 'object with keys {' + Object.keys(children as any).join(', ') + '}'
          : childrenString,
      );
    }
  }

  return subtreeCount;
}

function mapChildren(
  children: ReactNodeList | undefined,
  func: MapFunc,
  context: mixed,
): Array<React$Node> | undefined {
  if (children == null) {
    return children;
  }
  const result: Array<React$Node> = [];
  let count = 0;
  mapIntoArray(children, result, '', '', function(child) {
    return func.call(context, child, count++);
  });
  return result;
}

/**
 * children的迭代器
 * @param children 
 * @param forEachFunc 
 * @param forEachContext 
 */
function forEachChildren(
  children: ReactNodeList | undefined,
  forEachFunc: ForEachFunc,
  forEachContext: mixed,
): void {
  mapChildren(
    children,
    function(this: any) {
      forEachFunc.apply(this, arguments as any);
      // 不返回任何东西
    },
    forEachContext,
  );
}

export {
  forEachChildren as forEach
};