import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";

export const territoryKeys = {
  bairros: ["territories", "bairros"] as const,
  healthUnits: ["territories", "healthUnits"] as const,
};

async function fetchGeoJson(url: string): Promise<FeatureCollection> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao carregar camada territorial (${res.status})`);
  }
  return (await res.json()) as FeatureCollection;
}

export function useBairrosGeoJson(enabled: boolean) {
  return useQuery({
    queryKey: territoryKeys.bairros,
    queryFn: () => fetchGeoJson("/territories/bairros.geojson"),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useHealthTerritoriesGeoJson(enabled: boolean) {
  return useQuery({
    queryKey: territoryKeys.healthUnits,
    queryFn: () => fetchGeoJson("/territories/territorios.geojson"),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
