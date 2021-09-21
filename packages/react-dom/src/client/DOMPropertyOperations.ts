/* eslint-disable no-prototype-builtins */
import { disableJavaScriptURLs } from "../../../shared/ReactFeatureFlags";
import dangerousStyleValue from "../shared/dangerousStyleValue";
import { BOOLEAN, isAttributeNameSafe, OVERLOADED_BOOLEAN, PropertyInfo, shouldRemoveAttribute } from "../shared/DOMProperty";
import sanitizeURL from "../shared/sanitizeURL";
import warnValidStyle from "../shared/warnValidStyle";
import { shorthandToLonghand } from "./CSSShorthandProperty";
import { isOpaqueHydratingObject } from "./ReactDOMHostConfig";

export function getValueForAttribute(
  node: Element,
  name: string,
  expected: mixed,
): mixed {
  if (__DEV__) {
    if (!isAttributeNameSafe(name)) {
      return;
    }

    // If the object is an opaque reference ID, it's expected that
    // the next prop is different than the server value, so just return
    // expected
    if (isOpaqueHydratingObject(expected)) {
      return expected;
    }
    if (!node.hasAttribute(name)) {
      return expected === undefined ? undefined : null;
    }
    const value = node.getAttribute(name);
    if (value === '' + (expected as any)) {
      return expected;
    }
    return value;
  }
}

export function getValueForProperty(
  node: Element,
  name: string,
  expected: mixed,
  propertyInfo: PropertyInfo,
): mixed {
  if (__DEV__) {
    if (propertyInfo.mustUseProperty) {
      const {propertyName} = propertyInfo;
      return (node as any)[propertyName];
    } else {
      if (!disableJavaScriptURLs && propertyInfo.sanitizeURL) {
        // If we haven't fully disabled javascript: URLs, and if
        // the hydration is successful of a javascript: URL, we
        // still want to warn on the client.
        sanitizeURL('' + (expected as any));
      }

      const attributeName = propertyInfo.attributeName;

      let stringValue = null;

      if (propertyInfo.type === OVERLOADED_BOOLEAN) {
        if (node.hasAttribute(attributeName)) {
          const value = node.getAttribute(attributeName);
          if (value === '') {
            return true;
          }
          if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
            return value;
          }
          if (value === '' + (expected as any)) {
            return expected;
          }
          return value;
        }
      } else if (node.hasAttribute(attributeName)) {
        if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
          // We had an attribute but shouldn't have had one, so read it
          // for the error message.
          return node.getAttribute(attributeName);
        }
        if (propertyInfo.type === BOOLEAN) {
          // If this was a boolean, it doesn't matter what the value is
          // the fact that we have it is the same as the expected.
          return expected;
        }
        // Even if this property uses a namespace we use getAttribute
        // because we assume its namespaced name is the same as our config.
        // To use getAttributeNS we need the local name which we don't have
        // in our config atm.
        stringValue = node.getAttribute(attributeName);
      }

      if (shouldRemoveAttribute(name, expected, propertyInfo, false)) {
        return stringValue === null ? expected : stringValue;
      } else if (stringValue === '' + (expected as any)) {
        return expected;
      } else {
        return stringValue;
      }
    }
  }
}

function expandShorthandMap(styles: any) {
  const expanded: any = {};
  for (const key in styles) {
    const longhands = (shorthandToLonghand as any)[key] || [key];
    for (let i = 0; i < longhands.length; i++) {
      expanded[longhands[i]] = key;
    }
  }
  return expanded;
}

function isValueEmpty(value: any) {
  return value == null || typeof value === 'boolean' || value === '';
}

export function validateShorthandPropertyCollisionInDev(
  styleUpdates: any,
  nextStyles: any,
) {
  if (__DEV__) {
    if (!nextStyles) {
      return;
    }

    const expandedUpdates = expandShorthandMap(styleUpdates);
    const expandedStyles = expandShorthandMap(nextStyles);
    const warnedAbout: any = {};
    for (const key in expandedUpdates) {
      const originalKey = expandedUpdates[key];
      const correctOriginalKey = expandedStyles[key];
      if (correctOriginalKey && originalKey !== correctOriginalKey) {
        const warningKey = originalKey + ',' + correctOriginalKey;
        if (warnedAbout[warningKey]) {
          continue;
        }
        warnedAbout[warningKey] = true;
        console.error(
          '%s a style property during rerender (%s) when a ' +
            'conflicting property is set (%s) can lead to styling bugs. To ' +
            "avoid this, don't mix shorthand and non-shorthand properties " +
            'for the same value; instead, replace the shorthand with ' +
            'separate values.',
          isValueEmpty(styleUpdates[originalKey]) ? 'Removing' : 'Updating',
          originalKey,
          correctOriginalKey,
        );
      }
    }
  }
}

export function setValueForStyles(node: any, styles: any) {
  const style = node.style;
  for (let styleName in styles) {
    if (!styles.hasOwnProperty(styleName)) {
      continue;
    }
    const isCustomProperty = styleName.indexOf('--') === 0;
    if (__DEV__) {
      if (!isCustomProperty) {
        warnValidStyle(styleName, styles[styleName]);
      }
    }
    const styleValue = dangerousStyleValue(
      styleName,
      styles[styleName],
      isCustomProperty,
    );
    if (styleName === 'float') {
      styleName = 'cssFloat';
    }
    if (isCustomProperty) {
      style.setProperty(styleName, styleValue);
    } else {
      style[styleName] = styleValue;
    }
  }
}
