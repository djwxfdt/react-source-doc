/**
 * A UI node that can be rendered by React. React can render most primitives in
 * addition to elements and arrays of nodes.
 */

 declare type React$Portal = {};

 type React$Node = null
 | boolean
 | number
 | string
 | React$Element<any>
 | React$Portal
 | Iterable<React$Node | undefined>;

declare class React$AbstractComponent<A, B>{}

type empty = any

 type React$ElementType = string | React$AbstractComponent<empty, mixed>;

 declare type React$Element<ElementType extends React$ElementType> = {
  type: ElementType,
  props: React$ElementProps<ElementType>,
  key: React$Key | null,
  ref: any,
};


declare class React$Component<Props, State = void> {

  _reactInternals?: any
  
  // fields

  props: Props;
  state: State;

  // action methods

  setState(
    partialState: ?$Shape<State> | ((State, Props) => ?$Shape<State>),
    callback?: () => mixed,
  ): void;

  forceUpdate(callback?: () => void): void;

  // lifecycle methods

  constructor(props?: Props, context?: any): void;
  render(): React$Node;
  componentWillMount(): mixed;
  UNSAFE_componentWillMount(): mixed;
  componentDidMount(): mixed;
  componentWillReceiveProps(
    nextProps: Props,
    nextContext: any,
  ): mixed;
  UNSAFE_componentWillReceiveProps(
    nextProps: Props,
    nextContext: any,
  ): mixed;
  shouldComponentUpdate(
    nextProps: Props,
    nextState: State,
    nextContext: any,
  ): boolean;
  componentWillUpdate(
    nextProps: Props,
    nextState: State,
    nextContext: any,
  ): mixed;
  UNSAFE_componentWillUpdate(
    nextProps: Props,
    nextState: State,
    nextContext: any,
  ): mixed;
  componentDidUpdate(
    prevProps: Props,
    prevState: State,
    prevContext: any,
  ): mixed;
  componentWillUnmount(): mixed;
  componentDidCatch(
    error: Error,
    info: { componentStack: string}
  ): mixed;

  // long tail of other stuff not modeled very well

  refs: any;
  context: any;
  getChildContext(): any;
  static displayName?: ?string;
  static childContextTypes: any;
  static contextTypes: any;
  static propTypes: any;

  // We don't add a type for `defaultProps` so that its type may be entirely
  // inferred when we diff the type for `defaultProps` with `Props`. Otherwise
  // the user would need to define a type (which would be redundant) to override
  // the type we provide here in the base class.
  //
  // static defaultProps: $Shape<Props>;
}