/**
 * `useCreateFormStore` — controls the PatientCreateForm modal lifecycle and
 * persists the 422 draft so the user can resume after dropping a pin.
 */

import { create } from "zustand";

/** Minimal draft shape stored after a 422 "requiresManualPin" response. */
export interface CreateDraft {
  cns: string;
  condicao: "gestantes" | "tuberculose" | "hipertensao";
  base: Record<string, unknown>;
  gestantes?: Record<string, unknown>;
  tuberculose?: Record<string, unknown>;
  hipertensao?: Record<string, unknown>;
}

interface CreateFormState {
  /** Whether the create form modal is visible. */
  isOpen: boolean;
  /**
   * Coords pre-filled when opening from a map right-click or after pin-drop
   * recovery.  Null when opened from the header button.
   */
  prefilledCoords: { lat: number; lng: number } | null;
  /**
   * True while the user is expected to click the map to drop a create-pin
   * (after a 422 address-not-found response).
   */
  pinDropPending: boolean;
  /** Stashed form values from the 422 path so we can resume after pin drop. */
  draft: CreateDraft | null;
}

interface CreateFormActions {
  /** Open the modal, optionally pre-filling map coords (right-click path). */
  open: (coords?: { lat: number; lng: number }) => void;
  /** Close the modal and reset transient state. */
  close: () => void;
  /**
   * After a 422 response: stash the current draft and enter pin-drop mode.
   * The modal closes; MapView detects `pinDropPending` and activates the click
   * catcher.
   */
  enterPinDropMode: (draft: CreateDraft) => void;
  /**
   * Called by MapView when the user clicks the map in pin-drop mode.
   * Clears `pinDropPending`, sets `prefilledCoords`, and reopens the form so
   * the user can submit with the new coordinates.
   */
  completePinDrop: (coords: { lat: number; lng: number }) => void;
}

export const useCreateFormStore = create<CreateFormState & CreateFormActions>()(
  (set) => ({
    isOpen: false,
    prefilledCoords: null,
    pinDropPending: false,
    draft: null,

    open: (coords) =>
      set({ isOpen: true, prefilledCoords: coords ?? null }),

    close: () =>
      set({
        isOpen: false,
        prefilledCoords: null,
        // Preserve draft across close so pin-drop recovery survives the close.
      }),

    enterPinDropMode: (draft) =>
      set({
        isOpen: false,
        pinDropPending: true,
        draft,
        prefilledCoords: null,
      }),

    completePinDrop: (coords) =>
      set({
        pinDropPending: false,
        prefilledCoords: coords,
        isOpen: true,
      }),
  }),
);
