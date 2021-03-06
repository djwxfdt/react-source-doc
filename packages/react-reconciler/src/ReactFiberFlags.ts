import { enableCreateEventHandleAPI } from "../../shared/ReactFeatureFlags";

export type Flags = number;

export const NoFlags = /*                      */ 0b00000000000000000000000;

export const PerformedWork = /*                */ 0b00000000000000000000001;

// You can change the rest (and add more).
export const Placement = /*                    */ 0b00000000000000000000010;
export const Update = /*                       */ 0b00000000000000000000100;
export const PlacementAndUpdate = /*           */ Placement | Update;
export const Deletion = /*                     */ 0b00000000000000000001000;
export const ChildDeletion = /*                */ 0b00000000000000000010000;
export const ContentReset = /*                 */ 0b00000000000000000100000;
export const Callback = /*                     */ 0b00000000000000001000000;
export const DidCapture = /*                   */ 0b00000000000000010000000;
export const Ref = /*                          */ 0b00000000000000100000000;
export const Snapshot = /*                     */ 0b00000000000001000000000;
export const Passive = /*                      */ 0b00000000000010000000000;
export const Hydrating = /*                    */ 0b00000000000100000000000;
export const HydratingAndUpdate = /*           */ Hydrating | Update;
export const Visibility = /*                   */ 0b00000000001000000000000;


export const LifecycleEffectMask = Passive | Update | Callback | Ref | Snapshot;

export const HostEffectMask = /*               */ 0b00000000001111111111111;

// These are not really side effects, but we still reuse this field.
export const Incomplete = /*                   */ 0b00000000010000000000000;
export const ShouldCapture = /*                */ 0b00000000100000000000000;
export const ForceUpdateForLegacySuspense = /* */ 0b00000001000000000000000;
export const DidPropagateContext = /*          */ 0b00000010000000000000000;
export const NeedsPropagation = /*             */ 0b00000100000000000000000;


export const MountLayoutDev = /*               */ 0b01000000000000000000000;
export const MountPassiveDev = /*              */ 0b10000000000000000000000;

export const RefStatic = /*                    */ 0b00001000000000000000000;
export const LayoutStatic = /*                 */ 0b00010000000000000000000;
export const PassiveStatic = /*                */ 0b00100000000000000000000;

export const BeforeMutationMask =
  // TODO: Remove Update flag from before mutation phase by re-landing Visiblity
  // flag logic (see #20043)
  Update |
  Snapshot |
  (enableCreateEventHandleAPI
    ? // createEventHandle needs to visit deleted and hidden trees to
      // fire beforeblur
      // TODO: Only need to visit Deletions during BeforeMutation phase if an
      // element is focused.
      ChildDeletion | Visibility
    : 0);

export const MutationMask =
  Placement |
  Update |
  ChildDeletion |
  ContentReset |
  Ref |
  Hydrating |
  Visibility;
export const LayoutMask = Update | Callback | Ref | Visibility;

// TODO: Split into PassiveMountMask and PassiveUnmountMask
export const PassiveMask = Passive | ChildDeletion;

// Union of tags that don't get reset on clones.
// This allows certain concepts to persist without recalculting them,
// e.g. whether a subtree contains passive effects or portals.
export const StaticMask = LayoutStatic | PassiveStatic | RefStatic;
