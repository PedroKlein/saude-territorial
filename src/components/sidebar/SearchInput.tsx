"use client";

import { Search } from "lucide-react";
import { useFilterStore } from "@/stores/filterStore";

/**
 * Search input row for the sidebar.
 * Drives `filterStore.setSearch` on every keystroke so the map and
 * priority list react to the typed query immediately.
 */
export function SearchInput() {
  const searchText = useFilterStore((s) => s.searchText);
  const setSearch = useFilterStore((s) => s.setSearch);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        type="text"
        value={searchText}
        onChange={(e) => { setSearch(e.target.value); }}
        placeholder="Buscar paciente ou endereço…"
        className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/15"
      />
    </div>
  );
}
