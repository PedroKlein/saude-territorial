"use client";

/**
 * StopList — drag-to-reorder ordered stop rows using @dnd-kit/sortable.
 * Each row: grip handle + numbered avatar + patient name/meta + remove button.
 */

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Baby, Wind, HeartPulse } from "lucide-react";
import { usePlannerStore } from "@/stores/plannerStore";
import type { Stop } from "@/stores/plannerStore";
import type { PatientRecord } from "@/hooks/usePatientData";
import type { LayerId } from "@/config/layers.config";

type StopListProps = {
  /** Full patient records keyed by patient id — caller builds from usePatientData. */
  patientMap: Map<string, { record: PatientRecord; layerId: LayerId }>;
}

const CONDITION_STYLE: Record<string, { color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  gestantes:   { color: "oklch(72% 0.11 15)",  Icon: Baby },
  tuberculose: { color: "oklch(60% 0.09 40)",  Icon: Wind },
  hipertensao: { color: "oklch(60% 0.13 275)", Icon: HeartPulse },
};

const FALLBACK_COLOR = "oklch(58% 0.10 195)";

function SortableStopRow({
  stop,
  patientMap,
}: {
  stop: Stop;
  patientMap: StopListProps["patientMap"];
}) {
  const removeStop = usePlannerStore((s) => s.removeStop);
  const entry = patientMap.get(stop.patientId);
  const record = entry?.record;
  const layerId = entry?.layerId ?? "gestantes";
  const style = CONDITION_STYLE[layerId] ?? { color: FALLBACK_COLOR, Icon: Baby };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.patientId });

  const containerStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const microarea = record ? (record.microarea as string | undefined) ?? "" : "";
  const name = record?.nomeCompleto ?? stop.patientId.slice(0, 8) + "…";

  return (
    <div
      ref={setNodeRef}
      style={containerStyle}
      className="group flex items-start gap-2 rounded-md border border-transparent px-2 py-2 hover:border-neutral-200 hover:bg-neutral-50"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab touch-none text-neutral-300 hover:text-neutral-600 active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{
          backgroundColor: style.color,
          boxShadow: `0 0 0 2px white, 0 0 0 3px ${style.color}40`,
        }}
      >
        {stop.order}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-neutral-900">{name}</span>
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white"
            style={{ backgroundColor: style.color }}
            title={layerId}
          >
            <style.Icon className="h-3 w-3" />
          </span>
        </div>
        {microarea && (
          <div className="mt-0.5 truncate text-xs text-neutral-500">{microarea}</div>
        )}
      </div>

      <button
        onClick={() => { removeStop(stop.patientId); }}
        className="mt-1 rounded p-0.5 text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-700"
        aria-label="Remover parada"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function StopList({ patientMap }: StopListProps) {
  const stops = usePlannerStore((s) => s.stops);
  const reorderStops = usePlannerStore((s) => s.reorderStops);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = stops.findIndex((s) => s.patientId === active.id);
    const toIndex = stops.findIndex((s) => s.patientId === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderStops(fromIndex, toIndex);
    }
  }

  if (stops.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-neutral-400">
        Nenhuma parada adicionada ainda.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={stops.map((s) => s.patientId)}
        strategy={verticalListSortingStrategy}
      >
        {stops.map((stop) => (
          <SortableStopRow key={stop.patientId} stop={stop} patientMap={patientMap} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
