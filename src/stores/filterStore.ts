import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterablePatient {
  cns?: string;
  microarea?: string;
  alertLevel?: string;
  nomeCompleto?: string | null;
  dataUltimaAtualizacao?: string | null;
  confidence?: number;
  [key: string]: unknown;
}

interface FilterState {
  microareas: string[];
  alertLevels: string[];
  dateRange: { from: string; to: string } | null;
  searchText: string;
  hideUncertain: boolean;
}

interface FilterActions {
  setMicroareaFilter: (ids: string[]) => void;
  setAlertFilter: (levels: string[]) => void;
  setDateRange: (range: { from: string; to: string } | null) => void;
  setSearch: (text: string) => void;
  setHideUncertain: (hide: boolean) => void;
  clearFilters: () => void;
  applyFilters: <T extends FilterablePatient>(patients: T[]) => T[];
}

type FilterStore = FilterState & FilterActions;

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const INITIAL_STATE: FilterState = {
  microareas: [],
  alertLevels: [],
  dateRange: null,
  searchText: "",
  hideUncertain: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFilterStore = create<FilterStore>()((set, get) => ({
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

    // Filter by geocoding confidence
    if (hideUncertain) {
      filtered = filtered.filter(
        (p) => p.confidence === undefined || p.confidence >= 0.5
      );
    }

    // Filter by microárea
    if (microareas.length > 0) {
      filtered = filtered.filter(
        (p) => p.microarea && microareas.includes(p.microarea)
      );
    }

    // Filter by alert level
    if (alertLevels.length > 0) {
      filtered = filtered.filter(
        (p) => p.alertLevel && alertLevels.includes(p.alertLevel)
      );
    }

    // Filter by date range (dataUltimaAtualizacao)
    if (dateRange) {
      const from = new Date(dateRange.from).getTime();
      const to = new Date(dateRange.to).getTime();
      filtered = filtered.filter((p) => {
        if (!p.dataUltimaAtualizacao) return false;
        const d = new Date(p.dataUltimaAtualizacao).getTime();
        return d >= from && d <= to;
      });
    }

    // Filter by search text (name, case-insensitive)
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
}));
