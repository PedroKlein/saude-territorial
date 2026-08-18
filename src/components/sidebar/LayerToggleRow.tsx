"use client";

import type { LucideIcon } from "lucide-react";

type LayerToggleRowProps = {
  icon: LucideIcon;
  /**
   * Tailwind color class applied as the icon square's background when active,
   * e.g. `"bg-gestante"`, `"bg-tuberculose"`, `"bg-hipertensao"`.
   */
  colorClass: string;
  label: string;
  count: number;
  active: boolean;
  onToggle: () => void;
  /**
   * When true the row is rendered at reduced opacity — used for deferred
   * layers that exist in config but are not yet seeded.
   */
  muted?: boolean;
}

/**
 * A single Camadas toggle row:
 *   [colored icon square] [label]      [count]
 *
 * Clicking anywhere on the row toggles the layer; there is no separate
 * checkbox control.
 */
export function LayerToggleRow({
  icon: Icon,
  colorClass,
  label,
  count,
  active,
  onToggle,
  muted = false,
}: LayerToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-neutral-50 ${
        muted ? "opacity-50" : ""
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded text-white transition-colors ${
            active ? colorClass : "bg-neutral-200"
          }`}
        >
          <Icon className="h-3 w-3" />
        </span>
        <span
          className={`font-medium ${
            active ? "text-neutral-900" : "text-neutral-400"
          }`}
        >
          {label}
        </span>
      </span>
      <span className="text-xs text-neutral-500">{count}</span>
    </button>
  );
}
