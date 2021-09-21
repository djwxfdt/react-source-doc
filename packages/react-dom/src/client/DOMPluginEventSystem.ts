import { DOMEventName } from "../events/DOMEventNames";
import { EventSystemFlags, IS_NON_DELEGATED } from "../events/EventSystemFlags";
import { getEventListenerSet } from "./ReactDOMComponentTree";

// List of events that need to be individually attached to media elements.
export const mediaEventTypes: Array<DOMEventName> = [
  'abort',
  'canplay',
  'canplaythrough',
  'durationchange',
  'emptied',
  'encrypted',
  'ended',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'pause',
  'play',
  'playing',
  'progress',
  'ratechange',
  'seeked',
  'seeking',
  'stalled',
  'suspend',
  'timeupdate',
  'volumechange',
  'waiting',
];

export const nonDelegatedEvents: Set<DOMEventName> = new Set([
  'cancel',
  'close',
  'invalid',
  'load',
  'scroll',
  'toggle',
  // In order to reduce bytes, we insert the above array of media events
  // into this Set. Note: the "error" event isn't an exclusive media event,
  // and can occur on other elements too. Rather than duplicate that event,
  // we just take it from the media events array.
  ...mediaEventTypes,
]) as any;

function addTrappedEventListener(
  targetContainer: EventTarget,
  domEventName: DOMEventName,
  eventSystemFlags: EventSystemFlags,
  isCapturePhaseListener: boolean,
  isDeferredListenerForLegacyFBSupport?: boolean,
) {
  // let listener = createEventListenerWrapperWithPriority(
  //   targetContainer,
  //   domEventName,
  //   eventSystemFlags,
  // );
  // // If passive option is not supported, then the event will be
  // // active and not passive.
  // let isPassiveListener = undefined;
  // if (passiveBrowserEventsSupported) {
  //   // Browsers introduced an intervention, making these events
  //   // passive by default on document. React doesn't bind them
  //   // to document anymore, but changing this now would undo
  //   // the performance wins from the change. So we emulate
  //   // the existing behavior manually on the roots now.
  //   // https://github.com/facebook/react/issues/19651
  //   if (
  //     domEventName === 'touchstart' ||
  //     domEventName === 'touchmove' ||
  //     domEventName === 'wheel'
  //   ) {
  //     isPassiveListener = true;
  //   }
  // }

  // targetContainer =
  //   enableLegacyFBSupport && isDeferredListenerForLegacyFBSupport
  //     ? (targetContainer as any).ownerDocument
  //     : targetContainer;

  // let unsubscribeListener;
  // // When legacyFBSupport is enabled, it's for when we
  // // want to add a one time event listener to a container.
  // // This should only be used with enableLegacyFBSupport
  // // due to requirement to provide compatibility with
  // // internal FB www event tooling. This works by removing
  // // the event listener as soon as it is invoked. We could
  // // also attempt to use the {once: true} param on
  // // addEventListener, but that requires support and some
  // // browsers do not support this today, and given this is
  // // to support legacy code patterns, it's likely they'll
  // // need support for such browsers.
  // if (enableLegacyFBSupport && isDeferredListenerForLegacyFBSupport) {
  //   const originalListener = listener;
  //   listener = function(...p) {
  //     removeEventListener(
  //       targetContainer,
  //       domEventName,
  //       unsubscribeListener,
  //       isCapturePhaseListener,
  //     );
  //     return originalListener.apply(this, p);
  //   };
  // }
  // // TODO: There are too many combinations here. Consolidate them.
  // if (isCapturePhaseListener) {
  //   if (isPassiveListener !== undefined) {
  //     unsubscribeListener = addEventCaptureListenerWithPassiveFlag(
  //       targetContainer,
  //       domEventName,
  //       listener,
  //       isPassiveListener,
  //     );
  //   } else {
  //     unsubscribeListener = addEventCaptureListener(
  //       targetContainer,
  //       domEventName,
  //       listener,
  //     );
  //   }
  // } else {
  //   if (isPassiveListener !== undefined) {
  //     unsubscribeListener = addEventBubbleListenerWithPassiveFlag(
  //       targetContainer,
  //       domEventName,
  //       listener,
  //       isPassiveListener,
  //     );
  //   } else {
  //     unsubscribeListener = addEventBubbleListener(
  //       targetContainer,
  //       domEventName,
  //       listener,
  //     );
  //   }
  // }
}

export function listenToNonDelegatedEvent(
  domEventName: DOMEventName,
  targetElement: Element,
): void {
  if (__DEV__) {
    if (!nonDelegatedEvents.has(domEventName)) {
      console.error(
        'Did not expect a listenToNonDelegatedEvent() call for "%s". ' +
          'This is a bug in React. Please file an issue.',
        domEventName,
      );
    }
  }
  const isCapturePhaseListener = false;
  const listenerSet = getEventListenerSet(targetElement);
  const listenerSetKey = getListenerSetKey(
    domEventName,
    isCapturePhaseListener,
  );
  if (!listenerSet.has(listenerSetKey)) {
    addTrappedEventListener(
      targetElement,
      domEventName,
      IS_NON_DELEGATED,
      isCapturePhaseListener,
    );
    listenerSet.add(listenerSetKey);
  }
}

export function getListenerSetKey(
  domEventName: DOMEventName,
  capture: boolean,
): string {
  return `${domEventName}__${capture ? 'capture' : 'bubble'}`;
}
