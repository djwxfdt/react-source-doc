let didWarnValueNull = false;

export function validateProperties(type: any, props: any) {
  if (__DEV__) {
    if (type !== 'input' && type !== 'textarea' && type !== 'select') {
      return;
    }

    if (props != null && props.value === null && !didWarnValueNull) {
      didWarnValueNull = true;
      if (type === 'select' && props.multiple) {
        console.error(
          '`value` prop on `%s` should not be null. ' +
            'Consider using an empty array when `multiple` is set to `true` ' +
            'to clear the component or `undefined` for uncontrolled components.',
          type,
        );
      } else {
        console.error(
          '`value` prop on `%s` should not be null. ' +
            'Consider using an empty string to clear the component or `undefined` ' +
            'for uncontrolled components.',
          type,
        );
      }
    }
  }
}