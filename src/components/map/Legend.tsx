"use client";

/**
 * Legend content — purely the key rows; absolute positioning is handled by the
 * caller (MapWithData) so AnimatePresence can wrap it cleanly.
 */
export function Legend() {
  return (
    <div className="flex items-center gap-3 text-xs font-medium">
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full bg-alert-red" />
        Crítico
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full bg-alert-amber" />
        Atenção
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full bg-ok-green" />
        Normal
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full bg-brand" />
        US
      </span>
    </div>
  );
}
