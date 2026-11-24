import type L from "leaflet";

/**
 * Prevents Leaflet SVG polygon paths from taking DOM focus on click.
 */
export function attachNonFocusableHandlers(layer: L.Layer): void {
  layer.on("mousedown", (e: L.LeafletMouseEvent) => {
    e.originalEvent.preventDefault();
  });

  layer.on("click", (e: L.LeafletMouseEvent) => {
    const domTarget = e.originalEvent.target;
    if (domTarget instanceof HTMLElement || domTarget instanceof SVGElement) {
      domTarget.blur();
    }
  });
}
