import { Fiber } from "../react-reconciler/src/ReactInternalTypes";


export type ReactPortal = {
  $$typeof: Symbol | number,
  key: null | string,
  containerInfo: any,
  children: ReactNodeList,
  // TODO: figure out the API for cross-renderer implementation.
  implementation: any,
};

export type ReactProvider<T> = {
  $$typeof: Symbol | number,
  type: ReactProviderType<T>,
  key: null | string,
  ref: null,
  props: {
    value: T,
    children?: ReactNodeList,
  },
};

export type ReactConsumer<T> = {
  $$typeof: Symbol | number,
  type: ReactContext<T>,
  key: null | string,
  ref: null,
  props: {
    children: (value: T) => ReactNodeList,
  },
};

export type ReactNode = React$Element<any>
  | ReactPortal
  | ReactText
  | ReactFragment
  | ReactProvider<any>
  | ReactConsumer<any>;

export type ReactEmpty = null | void | boolean;

export type ReactFragment = ReactEmpty | Iterable<React$Node>;

export type ReactNodeList = ReactEmpty | React$Node;

export type ReactText = string | number;

export type RefObject = {
  current: any,
};


export type ReactScopeQuery = (
  type: string,
  props: {[key: string]: mixed},
  instance: mixed,
) => boolean;

export type ReactScopeInstance = {
  DO_NOT_USE_queryAllNodes(v: ReactScopeQuery): null | Array<Object>,
  DO_NOT_USE_queryFirstNode(v: ReactScopeQuery): null | Object,
  containsNode(v: Object): boolean,
  getChildContextValues: <T>(context: ReactContext<T>) => Array<T>,
};

export type MutableSourceVersion = $NonMaybeType<mixed>;

export type MutableSourceGetVersionFn = (
  source: $NonMaybeType<mixed>,
) => MutableSourceVersion;

export type ReactProviderType<T> = {
  $$typeof: Symbol | number,
  _context: ReactContext<T>,
};

export type ReactContext<T> = {
  $$typeof: Symbol | number,
  Consumer: ReactContext<T>,
  Provider: ReactProviderType<T>,
  _currentValue: T,
  _currentValue2: T,
  _threadCount: number,
  // DEV only
  _currentRenderer?: Object | null,
  _currentRenderer2?: Object | null,
  // This value may be added by application code
  // to improve DEV tooling display names
  displayName?: string,
};


export type MutableSource<Source extends $NonMaybeType<mixed>> = {
  _source: Source,

  _getVersion: MutableSourceGetVersionFn,

  // Tracks the version of this source at the time it was most recently read.
  // Used to determine if a source is safe to read from before it has been subscribed to.
  // Version number is only used during mount,
  // since the mechanism for determining safety after subscription is expiration time.
  //
  // As a workaround to support multiple concurrent renderers,
  // we categorize some renderers as primary and others as secondary.
  // We only expect there to be two concurrent renderers at most:
  // React Native (primary) and Fabric (secondary);
  // React DOM (primary) and React ART (secondary).
  // Secondary renderers store their context values on separate fields.
  // We use the same approach for Context.
  _workInProgressVersionPrimary: null | MutableSourceVersion,
  _workInProgressVersionSecondary: null | MutableSourceVersion,

  // DEV only
  // Used to detect multiple renderers using the same mutable source.
  _currentPrimaryRenderer?: Object | null,
  _currentSecondaryRenderer?: Object | null,

  // DEV only
  // Used to detect side effects that update a mutable source during render.
  // See https://github.com/facebook/react/issues/19948
  _currentlyRenderingFiber?: Fiber | null,
  _initialVersionAsOfFirstRender?: MutableSourceVersion | null,
};

export type ReactScope = {
  $$typeof: Symbol | number,
};

export type OffscreenMode =
  | 'hidden'
  | 'unstable-defer-without-hiding'
  | 'visible';
