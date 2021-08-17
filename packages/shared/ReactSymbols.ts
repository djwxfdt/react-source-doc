
const MAYBE_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
const FAUX_ITERATOR_SYMBOL = '@@iterator';

export let REACT_ELEMENT_TYPE: number | Symbol = 0xeac7;
export let REACT_PORTAL_TYPE: number | Symbol = 0xeaca;
export let REACT_FRAGMENT_TYPE: number | Symbol = 0xeacb;
export let REACT_STRICT_MODE_TYPE: number | Symbol = 0xeacc;
export let REACT_PROFILER_TYPE: number | Symbol = 0xead2;
export let REACT_PROVIDER_TYPE: number | Symbol = 0xeacd;
export let REACT_CONTEXT_TYPE: number | Symbol = 0xeace;
export let REACT_FORWARD_REF_TYPE: number | Symbol = 0xead0;
export let REACT_SUSPENSE_TYPE: number | Symbol = 0xead1;
export let REACT_SUSPENSE_LIST_TYPE: number | Symbol = 0xead8;
export let REACT_MEMO_TYPE: number | Symbol = 0xead3;
export let REACT_LAZY_TYPE: number | Symbol = 0xead4;
export let REACT_SCOPE_TYPE: number | Symbol = 0xead7;
export let REACT_OPAQUE_ID_TYPE: number | Symbol = 0xeae0;
export let REACT_DEBUG_TRACING_MODE_TYPE: number | Symbol = 0xeae1;
export let REACT_OFFSCREEN_TYPE: number | Symbol = 0xeae2;
export let REACT_LEGACY_HIDDEN_TYPE: number | Symbol = 0xeae3;
export let REACT_CACHE_TYPE: number | Symbol = 0xeae4;

if (typeof Symbol === 'function' && Symbol.for) {
  const symbolFor = Symbol.for;
  REACT_ELEMENT_TYPE = symbolFor('react.element');
  REACT_PORTAL_TYPE = symbolFor('react.portal');
  REACT_FRAGMENT_TYPE = symbolFor('react.fragment');
  REACT_STRICT_MODE_TYPE = symbolFor('react.strict_mode');
  REACT_PROFILER_TYPE = symbolFor('react.profiler');
  REACT_PROVIDER_TYPE = symbolFor('react.provider');
  REACT_CONTEXT_TYPE = symbolFor('react.context');
  REACT_FORWARD_REF_TYPE = symbolFor('react.forward_ref');
  REACT_SUSPENSE_TYPE = symbolFor('react.suspense');
  REACT_SUSPENSE_LIST_TYPE = symbolFor('react.suspense_list');
  REACT_MEMO_TYPE = symbolFor('react.memo');
  REACT_LAZY_TYPE = symbolFor('react.lazy');
  REACT_SCOPE_TYPE = symbolFor('react.scope');
  REACT_OPAQUE_ID_TYPE = symbolFor('react.opaque.id');
  REACT_DEBUG_TRACING_MODE_TYPE = symbolFor('react.debug_trace_mode');
  REACT_OFFSCREEN_TYPE = symbolFor('react.offscreen');
  REACT_LEGACY_HIDDEN_TYPE = symbolFor('react.legacy_hidden');
  REACT_CACHE_TYPE = symbolFor('react.cache');
}

export function getIteratorFn(maybeIterable?: any): (() => Iterator<any>) | null {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  const maybeIterator =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}