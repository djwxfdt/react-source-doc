/* eslint-disable no-prototype-builtins */
import { getCurrentFiberOwnerNameInDevOrNull } from "../../../react-reconciler/src/ReactCurrentFiber";
import isArray from "../../../shared/isArray";
import { checkControlledValueProps } from "../shared/ReactControlledValuePropTypes";
import { getToStringValue, toString } from "./ToStringValue";

let didWarnValueDefaultValue: boolean;

if (__DEV__) {
  didWarnValueDefaultValue = false;
}

function getDeclarationErrorAddendum() {
  const ownerName = getCurrentFiberOwnerNameInDevOrNull();
  if (ownerName) {
    return '\n\nCheck the render method of `' + ownerName + '`.';
  }
  return '';
}

type SelectWithWrapperState = HTMLSelectElement & {
  _wrapperState: {wasMultiple: boolean},
};

function updateOptions(
  node: HTMLSelectElement,
  multiple: boolean,
  propValue: any,
  setDefaultSelected: boolean,
) {
  type IndexableHTMLOptionsCollection = HTMLOptionsCollection & {
    [key: number]: HTMLOptionElement,
  };
  const options: IndexableHTMLOptionsCollection = node.options;

  if (multiple) {
    const selectedValues = (propValue as Array<string>);
    const selectedValue: any = {};
    for (let i = 0; i < selectedValues.length; i++) {
      // Prefix to avoid chaos with special keys.
      selectedValue['$' + selectedValues[i]] = true;
    }
    for (let i = 0; i < options.length; i++) {
      const selected = selectedValue.hasOwnProperty('$' + options[i].value);
      if (options[i].selected !== selected) {
        options[i].selected = selected;
      }
      if (selected && setDefaultSelected) {
        options[i].defaultSelected = true;
      }
    }
  } else {
    // Do not set `select.value` as exact behavior isn't consistent across all
    // browsers for all cases.
    const selectedValue = toString(getToStringValue((propValue as any)));
    let defaultSelected = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === selectedValue) {
        options[i].selected = true;
        if (setDefaultSelected) {
          options[i].defaultSelected = true;
        }
        return;
      }
      if (defaultSelected === null && !options[i].disabled) {
        defaultSelected = options[i];
      }
    }
    if (defaultSelected !== null) {
      defaultSelected.selected = true;
    }
  }
}

export function postMountWrapper(element: Element, props: any) {
  const node = ((element as any) as SelectWithWrapperState);
  node.multiple = !!props.multiple;
  const value = props.value;
  if (value != null) {
    updateOptions(node, !!props.multiple, value, false);
  } else if (props.defaultValue != null) {
    updateOptions(node, !!props.multiple, props.defaultValue, true);
  }
}
export function getHostProps(element: Element, props: Object) {
  return Object.assign({}, props, {
    value: undefined,
  });
}

const valuePropNames = ['value', 'defaultValue'];

function checkSelectPropTypes(props: any) {
  if (__DEV__) {
    checkControlledValueProps('select', props);

    for (let i = 0; i < valuePropNames.length; i++) {
      const propName = valuePropNames[i];
      if (props[propName] == null) {
        continue;
      }
      const propNameIsArray = isArray(props[propName]);
      if (props.multiple && !propNameIsArray) {
        console.error(
          'The `%s` prop supplied to <select> must be an array if ' +
            '`multiple` is true.%s',
          propName,
          getDeclarationErrorAddendum(),
        );
      } else if (!props.multiple && propNameIsArray) {
        console.error(
          'The `%s` prop supplied to <select> must be a scalar ' +
            'value if `multiple` is false.%s',
          propName,
          getDeclarationErrorAddendum(),
        );
      }
    }
  }
}

export function initWrapperState(element: Element, props: any) {
  const node = ((element as any) as SelectWithWrapperState);
  if (__DEV__) {
    checkSelectPropTypes(props);
  }

  node._wrapperState = {
    wasMultiple: !!props.multiple,
  };

  if (__DEV__) {
    if (
      props.value !== undefined &&
      props.defaultValue !== undefined &&
      !didWarnValueDefaultValue
    ) {
      console.error(
        'Select elements must be either controlled or uncontrolled ' +
          '(specify either the value prop, or the defaultValue prop, but not ' +
          'both). Decide between using a controlled or uncontrolled select ' +
          'element and remove one of these props. More info: ' +
          'https://reactjs.org/link/controlled-components',
      );
      didWarnValueDefaultValue = true;
    }
  }
}

export function restoreControlledState(element: Element, props: any) {
  const node = ((element as any) as SelectWithWrapperState);
  const value = props.value;

  if (value != null) {
    updateOptions(node, !!props.multiple, value, false);
  }
}

export function postUpdateWrapper(element: Element, props: any) {
  const node = ((element as any) as SelectWithWrapperState);
  const wasMultiple = node._wrapperState.wasMultiple;
  node._wrapperState.wasMultiple = !!props.multiple;

  const value = props.value;
  if (value != null) {
    updateOptions(node, !!props.multiple, value, false);
  } else if (wasMultiple !== !!props.multiple) {
    // For simplicity, reapply `defaultValue` if `multiple` is toggled.
    if (props.defaultValue != null) {
      updateOptions(node, !!props.multiple, props.defaultValue, true);
    } else {
      // Revert the select back to its default unselected state.
      updateOptions(node, !!props.multiple, props.multiple ? [] : '', false);
    }
  }
}