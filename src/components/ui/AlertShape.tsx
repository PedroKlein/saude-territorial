"use client";

/**
 * `AlertShape` — deuteranopia-safe alert-level indicator.
 *
 * The MVP plan mandated redundant shape+color encoding so alert states
 * survive color-vision deficiency. Prior code used a solid circle for both
 * `vermelho` and `amarelo`, distinguished only by hue — a fail on that
 * requirement. This primitive fixes it in one place:
 *
 * - `vermelho`: filled **circle** with a white gap ring (danger dot).
 * - `amarelo`: filled **triangle** with a white stroke (warning sign).
 * - `verde`: filled circle in `--color-ok-green` (used only in legends;
 *   markers hide it entirely because "no alert" needs no marker).
 *
 * Renders pure SVG so it can be stringified via `renderToStaticMarkup` for
 * Leaflet `divIcon`s and reused directly in React trees for the legend,
 * stats bar, and any future callout.
 */

import type { AlertLevel } from "@/types/alerts";

interface AlertShapeProps {
  level: AlertLevel;
  /** Outer size in pixels. Default 12 — legend/stats scale. */
  size?: number;
}

const LEVEL_COLOR: Record<AlertLevel, string> = {
  vermelho: "var(--color-alert-red)",
  amarelo: "var(--color-alert-amber)",
  verde: "var(--color-ok-green)",
};

export function AlertShape({ level, size = 12 }: AlertShapeProps) {
  const color = LEVEL_COLOR[level];

  if (level === "amarelo") {
    // Warning triangle. 24-unit viewBox; 2-unit inset leaves room for the
    // white stroke without clipping.
    return (
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        <polygon
          points="12,2 22,21 2,21"
          fill={color}
          stroke="white"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Circle for vermelho + verde.
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <circle cx="12" cy="12" r="9" fill={color} stroke="white" strokeWidth={2} />
    </svg>
  );
}
