"use client";

import { X } from "lucide-react";
import { Baby, Wind, HeartPulse } from "lucide-react";
import { AlertShape } from "@/components/ui/AlertShape";
import { LAYER_CONFIG } from "@/config/layers.config";

/**
 * Legend content — purely the key rows; absolute positioning is handled by the
 * caller (MapWithData) so AnimatePresence can wrap it cleanly.
 *
 * Alert-level icons intentionally use distinct SHAPES (circle for critical,
 * triangle for warning) to survive deuteranopia — see AlertShape.tsx.
 *
 * onClose: when provided, renders an X button at the top-right to dismiss.
 */

type LegendProps = {
  onClose?: () => void;
}

const PRIMARY_LAYERS = [
  { id: "gestantes" as const, Icon: Baby },
  { id: "tuberculose" as const, Icon: Wind },
  { id: "hipertensao" as const, Icon: HeartPulse },
] as const;

export function Legend({ onClose }: LegendProps) {
  return (
    <div className="relative bg-white/95 border rounded-lg shadow-sm p-3 space-y-2.5 min-w-[200px]">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-border"
          aria-label="Ocultar legenda"
        >
          <X className="size-2.5" />
        </button>
      )}

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Alertas
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <AlertShape level="vermelho" size={12} />
            <span>Crítico</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <AlertShape level="amarelo" size={12} />
            <span>Atenção</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <AlertShape level="verde" size={12} />
            <span>Normal</span>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Condições
        </p>
        <div className="space-y-1">
          {PRIMARY_LAYERS.map(({ id, Icon }) => {
            const cfg = LAYER_CONFIG[id];
            return (
              <div key={id} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--${cfg.colorToken})` }}
                />
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Locais
        </p>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-brand text-white">
            {/* Plus / medical cross — mirrors the US marker in MapView.tsx */}
            <svg viewBox="0 0 12 12" className="size-2.5" fill="currentColor" aria-hidden="true">
              <path d="M5 0h2v5h5v2H7v5H5V7H0V5h5z" />
            </svg>
          </span>
          <span>US Moab Caldas</span>
        </div>
      </div>
    </div>
  );
}
