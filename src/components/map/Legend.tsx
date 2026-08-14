"use client";

import { AlertShape } from "@/components/ui/AlertShape";

/**
 * Legend content — purely the key rows; absolute positioning is handled by the
 * caller (MapWithData) so AnimatePresence can wrap it cleanly.
 *
 * Alert-level icons intentionally use distinct SHAPES (circle for critical,
 * triangle for warning) to survive deuteranopia — see AlertShape.tsx.
 */
export function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs font-medium">
      <span className="flex items-center gap-1">
        <AlertShape level="vermelho" size={12} />
        Crítico
      </span>
      <span className="flex items-center gap-1">
        <AlertShape level="amarelo" size={12} />
        Atenção
      </span>
      <span className="flex items-center gap-1">
        <AlertShape level="verde" size={12} />
        Normal
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full bg-brand" />
        US
      </span>
    </div>
  );
}
