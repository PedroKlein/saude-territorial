import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LayerSidebar } from "./LayerSidebar";
import { useMapStore } from "@/stores/mapStore";

vi.mock("@/hooks/useTerritoryData", () => ({
  useBairrosGeoJson: () => ({ data: undefined, isFetching: false }),
  useHealthTerritoriesGeoJson: () => ({ data: undefined, isFetching: false }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("LayerSidebar territory toggles", () => {
  beforeEach(() => {
    useMapStore.setState(useMapStore.getInitialState());
  });

  it("renders and toggles Microáreas, Bairros, and Territórios (US)", () => {
    render(<LayerSidebar />, { wrapper: Wrapper });

    const microBtn = screen.getByRole("button", { name: "Microáreas" });
    const bairrosBtn = screen.getByRole("button", { name: "Bairros" });
    const unitBtn = screen.getByRole("button", { name: "Territórios (US)" });

    expect(microBtn).toHaveAttribute("aria-pressed", "false");
    expect(bairrosBtn).toHaveAttribute("aria-pressed", "false");
    expect(unitBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(microBtn);
    fireEvent.click(bairrosBtn);
    fireEvent.click(unitBtn);

    const state = useMapStore.getState();
    expect(state.showTerritories).toBe(true);
    expect(state.showBairros).toBe(true);
    expect(state.showHealthTerritories).toBe(true);

    expect(microBtn).toHaveAttribute("aria-pressed", "true");
    expect(bairrosBtn).toHaveAttribute("aria-pressed", "true");
    expect(unitBtn).toHaveAttribute("aria-pressed", "true");
  });
});
