import DynamicMap from "@/components/map/DynamicMap";
import { LayerSidebar } from "@/components/sidebar/LayerSidebar";

/**
 * Página inicial do painel.
 * Renderiza o mapa interativo com sidebar de camadas.
 */
export default function DashboardPage() {
  return (
    <div className="flex h-full w-full">
      <LayerSidebar />
      <div className="flex-1">
        <DynamicMap />
      </div>
    </div>
  );
}
