"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type ConfirmDialogProps = {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button red. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Disables the confirm button while a mutation is in flight. */
  isPending?: boolean;
}

/**
 * Reusable confirm modal.
 *
 * Keyboard: ESC → cancel, Enter → confirm.
 * Uses `L.DomEvent.disableClickPropagation` on the root so map clicks never
 * leak through (same belt-and-braces pattern as `ManualPinOverlay`).
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
  onCancel,
  isPending = false,
}: ConfirmDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Belt-and-braces: prevent clicks from leaking into the Leaflet map.
  // Leaflet touches `window` at module load, so we import it dynamically
  // inside the effect — otherwise the dashboard's SSR prerender crashes
  // when this dialog imports at the top of the module graph.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled) return;
      const L = mod.default;
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!isPending) onConfirm();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("keydown", handleKey); };
  }, [onCancel, onConfirm, isPending]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-3 text-base font-semibold">{title}</h3>
        <div className="mb-5 text-sm text-muted-foreground">{body}</div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
