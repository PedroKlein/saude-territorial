import { create } from "zustand";
import { persist } from "zustand/middleware";

type FilterablePatient = {
  cns?: string;
  microarea?: string;
  alertLevel?: string;
  nomeCompleto?: string | null;
  dataUltimaAtualizacao?: string | null;
  confidence?: number;
  [key: string]: unknown;
}

type FilterState = {
  microareas: string[];
  alertLevels: string[];
  dateRange: { from: string; to: string } | null;
  searchText: string;
  hideUncertain: boolean;
}

type FilterActions = {
  setMicroareaFilter: (ids: string[]) => void;
  setAlertFilter: (levels: string[]) => void;
  setDateRange: (range: { from: string; to: string } | null) => void;
  setSearch: (text: string) => void;
  setHideUncertain: (hide: boolean) => void;
  clearFilters: () => void;
  applyFilters: <T extends FilterablePatient>(patients: T[]) => T[];
}

type FilterStore = FilterState & FilterActions;

const INITIAL_STATE: FilterState = {
  microareas: [],
  alertLevels: [],
  dateRange: null,
  searchText: "",
  hideUncertain: false,
};

export const useFilterStore = create<FilterStore>()(persist(
  (set, get) => ({
  ...INITIAL_STATE,

  setMicroareaFilter: (ids) => set({ microareas: ids }),
  setAlertFilter: (levels) => set({ alertLevels: levels }),
  setDateRange: (range) => set({ dateRange: range }),
  setSearch: (text) => set({ searchText: text }),
  setHideUncertain: (hide) => set({ hideUncertain: hide }),
  clearFilters: () => set(INITIAL_STATE),

  applyFilters: <T extends FilterablePatient>(patients: T[]): T[] => {
    const { microareas, alertLevels, dateRange, searchText, hideUncertain } = get();
    let filtered = patients;

    if (hideUncertain) {
      filtered = filtered.filter(
        (p) => p.confidence === undefined || p.confidence >= 0.5
      );
    }

    if (microareas.length > 0) {
      filtered = filtered.filter(
        (p) => p.microarea && microareas.includes(p.microarea)
      );
    }

    if (alertLevels.length > 0) {
      filtered = filtered.filter(
        (p) => p.alertLevel && alertLevels.includes(p.alertLevel)
      );
    }

    if (dateRange) {
      const from = new Date(dateRange.from).getTime();
      const to = new Date(dateRange.to).getTime();
      filtered = filtered.filter((p) => {
        if (!p.dataUltimaAtualizacao) return false;
        const d = new Date(p.dataUltimaAtualizacao).getTime();
        return d >= from && d <= to;
      });
    }

    if (searchText.trim()) {
      const needle = searchText.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const name = (p.nomeCompleto ?? "").toLowerCase();
        const cns = (p.cns ?? "").toLowerCase();
        return name.includes(needle) || cns.includes(needle);
      });
    }

    return filtered;
  },
}),
  {
    name: "saude-territorial-filters",
    partialize: (state) => ({
      microareas: state.microareas,
      alertLevels: state.alertLevels,
      hideUncertain: state.hideUncertain,
    }),
  }
));
