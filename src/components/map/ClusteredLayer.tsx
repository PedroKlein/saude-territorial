"use client";

import MarkerClusterGroup from "react-leaflet-cluster";
import { useMemo, type ReactNode } from "react";

interface ClusteredLayerProps {
  children: ReactNode;
}

/**
 * Wraps patient markers in a cluster group that aggregates
 * at low zoom levels for performance and readability.
 */
export function ClusteredLayer({ children }: ClusteredLayerProps) {
  const clusterOptions = useMemo(
    () => ({
      chunkedLoading: true,
      maxClusterRadius: 60,
      disableClusteringAtZoom: 17,
      removeOutsideVisibleBounds: true,
      spiderfyOnMaxZoom: true,
    }),
    []
  );

  return (
    <MarkerClusterGroup {...clusterOptions}>
      {children}
    </MarkerClusterGroup>
  );
}
