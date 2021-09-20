import checkPropTypes from "../../shared/checkPropTypes";
import getComponentNameFromType from "../../shared/getComponentNameFromType";
import isArray from "../../shared/isArray";
import isValidElementType from "../../shared/isValidElementType";
import { describeUnknownElementTypeFrameInDEV } from "../../shared/ReactComponentStackFrame";
import { getIteratorFn, REACT_ELEMENT_TYPE, REACT_FORWARD_REF_TYPE, REACT_FRAGMENT_TYPE, REACT_MEMO_TYPE } from "../../shared/ReactSymbols";
import ReactCurrentOwner from "./ReactCurrentOwner";
import { setExtraStackFrame } from "./ReactDebugCurrentFrame";
import { createElement, isValidElement } from "./ReactElement";


const ownerHasKeyUseWarning: any = {}


function setCurrentlyValidatingElement(element: any) {
  if (__DEV__) {
    if (element) {
      const owner = element._owner;
      const stack = describeUnknownElementTypeFrameInDEV(
        element.type,
        element._source,
        owner ? owner.type : null,
      );
      setExtraStackFrame(stack);
    } else {
      setExtraStackFrame(null);
    }
  }
}

function getDeclarationErrorAddendum() {
  if (ReactCurrentOwner.current) {
    const name = getComponentNameFromType(ReactCurrentOwner.current.type);
    if (name) {
      return '\n\nCheck the render method of `' + name + '`.';
    }
  }
  return '';
}

function getCurrentComponentErrorInfo(parentType: any) {
  let info = getDeclarationErrorAddendum();

  if (!info) {
    const parentName =
      typeof parentType === 'string'
        ? parentType
        : parentType.displayName || parentType.name;
    if (parentName) {
      info = `\n\nCheck the top-level render call using <${parentName}>.`;
    }
  }
  return info;
}

function validateExplicitKey(element: any, parentType: any) {
  if (!element._store || element._store.validated || element.key != null) {
    return;
  }
  element._store.validated = true;

  const currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
  if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
    return;
  }
  ownerHasKeyUseWarning[currentComponentErrorInfo] = true;

  // Usually the current owner is the offender, but if it accepts children as a
  // property, it may be the creator of the child that's responsible for
  // assigning it a key.
  let childOwner = '';
  if (
    element &&
    element._owner &&
    element._owner !== ReactCurrentOwner.current
  ) {
    // Give the component that originally created this child.
    childOwner = ` It was passed a child from ${getComponentNameFromType(
      element._owner.type,
    )}.`;
  }

  if (__DEV__) {
    setCurrentlyValidatingElement(element);
    console.error(
      'Each child in a list should have a unique "key" prop.' +
        '%s%s See https://reactjs.org/link/warning-keys for more information.',
      currentComponentErrorInfo,
      childOwner,
    );
    setCurrentlyValidatingElement(null);
  }
}


function validateChildKeys(node: any, parentType: any) {
  if (typeof node !== 'object') {
    return;
  }
  if (isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      if (isValidElement(child)) {
        validateExplicitKey(child, parentType);
      }
    }
  } else if (isValidElement(node)) {
    // This element was passed in a valid location.
    if (node._store) {
      node._store.validated = true;
    }
  } else if (node) {
    const iteratorFn = getIteratorFn(node);
    if (typeof iteratorFn === 'function') {
      // Entry iterators used to provide implicit keys,
      // but now we print a separate warning for them later.
      if (iteratorFn !== node.entries) {
        const iterator = iteratorFn.call(node);
        let step;
        while (!(step = iterator.next()).done) {
          if (isValidElement(step.value)) {
            validateExplicitKey(step.value, parentType);
          }
        }
      }
    }
  }
}


function getSourceInfoErrorAddendum(source: any) {
  if (source !== undefined) {
    const fileName = source.fileName.replace(/^.*[\\\/]/, '');
    const lineNumber = source.lineNumber;
    return '\n\nCheck your code at ' + fileName + ':' + lineNumber + '.';
  }
  return '';
}


function getSourceInfoErrorAddendumForProps(elementProps: any) {
  if (elementProps !== null && elementProps !== undefined) {
    return getSourceInfoErrorAddendum(elementProps.__source);
  }
  return '';
}

export function createElementWithValidation(this: any, type: any, props: any, children: any) {
  const validType = isValidElementType(type);

  // We warn in this case but don't throw. We expect the element creation to
  // succeed and there will likely be errors in render.
  if (!validType) {
    let info = '';
    if (
      type === undefined ||
      (typeof type === 'object' &&
        type !== null &&
        Object.keys(type).length === 0)
    ) {
      info +=
        ' You likely forgot to export your component from the file ' +
        "it's defined in, or you might have mixed up default and named imports.";
    }

    const sourceInfo = getSourceInfoErrorAddendumForProps(props);
    if (sourceInfo) {
      info += sourceInfo;
    } else {
      info += getDeclarationErrorAddendum();
    }

    let typeString;
    if (type === null) {
      typeString = 'null';
    } else if (isArray(type)) {
      typeString = 'array';
    } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
      typeString = `<${getComponentNameFromType(type.type) || 'Unknown'} />`;
      info =
        ' Did you accidentally export a JSX literal instead of a component?';
    } else {
      typeString = typeof type;
    }

    if (__DEV__) {
      console.error(
        'React.createElement: type is invalid -- expected a string (for ' +
          'built-in components) or a class/function (for composite ' +
          'components) but got: %s.%s',
        typeString,
        info,
      );
    }
  }

  const element = createElement.apply(this, arguments as any);

  // The result can be nullish if a mock or a custom function is used.
  // TODO: Drop this when these are no longer allowed as the type argument.
  if (element == null) {
    return element;
  }

  // Skip key warning if the type isn't valid since our key validation logic
  // doesn't expect a non-string/function type and can throw confusing errors.
  // We don't want exception behavior to differ between dev and prod.
  // (Rendering will throw with a helpful message and as soon as the type is
  // fixed, the key warnings will appear.)
  if (validType) {
    for (let i = 2; i < arguments.length; i++) {
      validateChildKeys(arguments[i], type);
    }
  }

  if (type === REACT_FRAGMENT_TYPE) {
    validateFragmentProps(element);
  } else {
    validatePropTypes(element);
  }

  return element;
}

function validateFragmentProps(fragment: any) {
  if (__DEV__) {
    const keys = Object.keys(fragment.props);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key !== 'children' && key !== 'key') {
        setCurrentlyValidatingElement(fragment);
        console.error(
          'Invalid prop `%s` supplied to `React.Fragment`. ' +
            'React.Fragment can only have `key` and `children` props.',
          key,
        );
        setCurrentlyValidatingElement(null);
        break;
      }
    }

    if (fragment.ref !== null) {
      setCurrentlyValidatingElement(fragment);
      console.error('Invalid attribute `ref` supplied to `React.Fragment`.');
      setCurrentlyValidatingElement(null);
    }
  }
}

let propTypesMisspellWarningShown: boolean;

if (__DEV__) {
  propTypesMisspellWarningShown = false;
}
function validatePropTypes(element: any) {
  if (__DEV__) {
    const type = element.type;
    if (type === null || type === undefined || typeof type === 'string') {
      return;
    }
    let propTypes;
    if (typeof type === 'function') {
      propTypes = type.propTypes;
    } else if (
      typeof type === 'object' &&
      (type.$$typeof === REACT_FORWARD_REF_TYPE ||
        // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        type.$$typeof === REACT_MEMO_TYPE)
    ) {
      propTypes = type.propTypes;
    } else {
      return;
    }
    if (propTypes) {
      // Intentionally inside to avoid triggering lazy initializers:
      const name = getComponentNameFromType(type);
      checkPropTypes(propTypes, element.props, 'prop', name!, element);
    } else if (type.PropTypes !== undefined && !propTypesMisspellWarningShown) {
      propTypesMisspellWarningShown = true;
      // Intentionally inside to avoid triggering lazy initializers:
      const name = getComponentNameFromType(type);
      console.error(
        'Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?',
        name || 'Unknown',
      );
    }
    if (
      typeof type.getDefaultProps === 'function' &&
      !type.getDefaultProps.isReactClassApproved
    ) {
      console.error(
        'getDefaultProps is only used on classic React.createClass ' +
          'definitions. Use a static property named `defaultProps` instead.',
      );
    }
  }
}

