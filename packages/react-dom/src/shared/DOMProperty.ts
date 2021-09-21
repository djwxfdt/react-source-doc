/* eslint-disable no-prototype-builtins */
/* eslint-disable no-misleading-character-class */

import hasOwnProperty from "../../../shared/hasOwnProperty";
import { enableFilterEmptyStringAttributesDOM } from "../../../shared/ReactFeatureFlags";

type PropertyType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// A reserved attribute.
// It is handled by React separately and shouldn't be written to the DOM.
export const RESERVED = 0;

// A simple string attribute.
// Attributes that aren't in the filter are presumed to have this type.
export const STRING = 1;

// A string attribute that accepts booleans in React. In HTML, these are called
// "enumerated" attributes with "true" and "false" as possible values.
// When true, it should be set to a "true" string.
// When false, it should be set to a "false" string.
export const BOOLEANISH_STRING = 2;

// A real boolean attribute.
// When true, it should be present (set either to an empty string or its name).
// When false, it should be omitted.
export const BOOLEAN = 3;

// An attribute that can be used as a flag as well as with a value.
// When true, it should be present (set either to an empty string or its name).
// When false, it should be omitted.
// For any other value, should be present with that value.
export const OVERLOADED_BOOLEAN = 4;

// An attribute that must be numeric or parse as a numeric.
// When falsy, it should be removed.
export const NUMERIC = 5;

// An attribute that must be positive numeric or parse as a positive numeric.
// When falsy, it should be removed.
export const POSITIVE_NUMERIC = 6;

export type PropertyInfo = {
  acceptsBooleans: boolean,
  attributeName: string,
  attributeNamespace: string | null,
  mustUseProperty: boolean,
  propertyName: string,
  type: PropertyType,
  sanitizeURL: boolean,
  removeEmptyString: boolean,
};

export const ATTRIBUTE_NAME_START_CHAR =
  ':A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
/* eslint-enable max-len */
export const ATTRIBUTE_NAME_CHAR =
  ATTRIBUTE_NAME_START_CHAR + '\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040';

export const VALID_ATTRIBUTE_NAME_REGEX = new RegExp(
  '^[' + ATTRIBUTE_NAME_START_CHAR + '][' + ATTRIBUTE_NAME_CHAR + ']*$',
);

const illegalAttributeNameCache: any = {};
const validatedAttributeNameCache:any = {};

const properties: any = {};
const reservedProps = [
  'children',
  'dangerouslySetInnerHTML',
  // TODO: This prevents the assignment of defaultValue to regular
  // elements (not just inputs). Now that ReactDOMInput assigns to the
  // defaultValue property -- do we need this?
  'defaultValue',
  'defaultChecked',
  'innerHTML',
  'suppressContentEditableWarning',
  'suppressHydrationWarning',
  'style',
];

reservedProps.forEach(name => {
  properties[name] = new (PropertyInfoRecord as any)(
    name,
    RESERVED,
    false, // mustUseProperty
    name, // attributeName
    null, // attributeNamespace
    false, // sanitizeURL
    false, // removeEmptyString
  );
});

function PropertyInfoRecord(this: any, 
  name: string,
  type: PropertyType,
  mustUseProperty: boolean,
  attributeName: string,
  attributeNamespace: string | null,
  sanitizeURL: boolean,
  removeEmptyString: boolean,
) {
  this.acceptsBooleans =
    type === BOOLEANISH_STRING ||
    type === BOOLEAN ||
    type === OVERLOADED_BOOLEAN;
  this.attributeName = attributeName;
  this.attributeNamespace = attributeNamespace;
  this.mustUseProperty = mustUseProperty;
  this.propertyName = name;
  this.type = type;
  this.sanitizeURL = sanitizeURL;
  this.removeEmptyString = removeEmptyString;
}

export function getPropertyInfo(name: string): PropertyInfo | null {
  return properties.hasOwnProperty(name) ? properties[name] : null;
}

export function shouldRemoveAttributeWithWarning(
  name: string,
  value: mixed,
  propertyInfo: PropertyInfo | null,
  isCustomComponentTag: boolean,
): boolean {
  if (propertyInfo !== null && propertyInfo.type === RESERVED) {
    return false;
  }
  switch (typeof value) {
    case 'function':
    // $FlowIssue symbol is perfectly valid here
    case 'symbol': // eslint-disable-line
      return true;
    case 'boolean': {
      if (isCustomComponentTag) {
        return false;
      }
      if (propertyInfo !== null) {
        return !propertyInfo.acceptsBooleans;
      } else {
        const prefix = name.toLowerCase().slice(0, 5);
        return prefix !== 'data-' && prefix !== 'aria-';
      }
    }
    default:
      return false;
  }
}


export function shouldIgnoreAttribute(
  name: string,
  propertyInfo: PropertyInfo | null,
  isCustomComponentTag: boolean,
): boolean {
  if (propertyInfo !== null) {
    return propertyInfo.type === RESERVED;
  }
  if (isCustomComponentTag) {
    return false;
  }
  if (
    name.length > 2 &&
    (name[0] === 'o' || name[0] === 'O') &&
    (name[1] === 'n' || name[1] === 'N')
  ) {
    return true;
  }
  return false;
}

export function shouldRemoveAttribute(
  name: string,
  value: mixed,
  propertyInfo: PropertyInfo | null,
  isCustomComponentTag: boolean,
): boolean {
  if (value === null || typeof value === 'undefined') {
    return true;
  }
  if (
    shouldRemoveAttributeWithWarning(
      name,
      value,
      propertyInfo,
      isCustomComponentTag,
    )
  ) {
    return true;
  }
  if (isCustomComponentTag) {
    return false;
  }
  if (propertyInfo !== null) {
    if (enableFilterEmptyStringAttributesDOM) {
      if (propertyInfo.removeEmptyString && value === '') {
        if (__DEV__) {
          if (name === 'src') {
            console.error(
              'An empty string ("") was passed to the %s attribute. ' +
                'This may cause the browser to download the whole page again over the network. ' +
                'To fix this, either do not render the element at all ' +
                'or pass null to %s instead of an empty string.',
              name,
              name,
            );
          } else {
            console.error(
              'An empty string ("") was passed to the %s attribute. ' +
                'To fix this, either do not render the element at all ' +
                'or pass null to %s instead of an empty string.',
              name,
              name,
            );
          }
        }
        return true;
      }
    }

    switch (propertyInfo.type) {
      case BOOLEAN:
        return !value;
      case OVERLOADED_BOOLEAN:
        return value === false;
      case NUMERIC:
        return isNaN(value);
      case POSITIVE_NUMERIC:
        return isNaN(value) || (value as any) < 1;
    }
  }
  return false;
}

export function isAttributeNameSafe(attributeName: string): boolean {
  if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) {
    return true;
  }
  if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) {
    return false;
  }
  if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
    validatedAttributeNameCache[attributeName] = true;
    return true;
  }
  illegalAttributeNameCache[attributeName] = true;
  if (__DEV__) {
    console.error('Invalid attribute name: `%s`', attributeName);
  }
  return false;
}
