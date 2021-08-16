import getComponentNameFromType from "../../shared/getComponentNameFromType";
import { REACT_STRICT_MODE_TYPE } from "../../shared/ReactSymbols";
import { ReactContext, ReactProviderType } from "../../shared/ReactTypes";
import { Fiber } from "./ReactInternalTypes";
import { CacheComponent, ClassComponent, ContextConsumer, ContextProvider, DehydratedFragment, ForwardRef, Fragment, FunctionComponent, HostComponent, HostPortal, HostRoot, HostText, IncompleteClassComponent, IndeterminateComponent, LazyComponent, LegacyHiddenComponent, MemoComponent, Mode, OffscreenComponent, Profiler, ScopeComponent, SimpleMemoComponent, SuspenseComponent, SuspenseListComponent } from "./ReactWorkTags";


function getContextName(type: ReactContext<any>) {
  return type.displayName || 'Context';
}

// Keep in sync with shared/getComponentNameFromType
function getWrappedName(
  outerType: mixed,
  innerType: any,
  wrapperName: string,
): string {
  const functionName = innerType.displayName || innerType.name || '';
  return (
    (outerType as any).displayName ||
    (functionName !== '' ? `${wrapperName}(${functionName})` : wrapperName)
  );
}


export default function getComponentNameFromFiber(fiber: Fiber): string | null {
  const {tag, type} = fiber;
  switch (tag) {
    case CacheComponent:
      return 'Cache';
    case ContextConsumer:
      const context: ReactContext<any> = type as any;
      return getContextName(context) + '.Consumer';
    case ContextProvider:
      const provider: ReactProviderType<any> = (type as any);
      return getContextName(provider._context) + '.Provider';
    case DehydratedFragment:
      return 'DehydratedFragment';
    case ForwardRef:
      return getWrappedName(type, type.render, 'ForwardRef');
    case Fragment:
      return 'Fragment';
    case HostComponent:
      // Host component type is the display name (e.g. "div", "View")
      return type;
    case HostPortal:
      return 'Portal';
    case HostRoot:
      return 'Root';
    case HostText:
      return 'Text';
    case LazyComponent:
      // Name comes from the type in this case; we don't have a tag.
      return getComponentNameFromType(type);
    case LegacyHiddenComponent:
      return 'LegacyHidden';
    case Mode:
      if (type === REACT_STRICT_MODE_TYPE) {
        // Don't be less specific than shared/getComponentNameFromType
        return 'StrictMode';
      }
      return 'Mode';
    case OffscreenComponent:
      return 'Offscreen';
    case Profiler:
      return 'Profiler';
    case ScopeComponent:
      return 'Scope';
    case SuspenseComponent:
      return 'Suspense';
    case SuspenseListComponent:
      return 'SuspenseList';

    // The display name for this tags come from the user-provided type:
    case ClassComponent:
    case FunctionComponent:
    case IncompleteClassComponent:
    case IndeterminateComponent:
    case MemoComponent:
    case SimpleMemoComponent:
      if (typeof type === 'function') {
        return (type as any).displayName || type.name || null;
      }
      if (typeof type === 'string') {
        return type;
      }
      break;
  }

  return null;
}
