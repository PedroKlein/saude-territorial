"use client";

/**
 * Persistent floating legend showing urgency color key + US marker.
 * Positioned bottom-left of the map with semi-transparent background.
 */
export function Legend() {
  return (
    <div className="absolute bottom-14 left-4 z-[1000] rounded-lg bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm">
      <div className="flex items-center gap-3 text-xs font-medium">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#dc2626]" />
          Crítico
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#d97706]" />
          Atenção
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#16a34a]" />
          Normal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-[#2563eb]" />
          US
        </span>
      </div>
    </div>
  );
}
