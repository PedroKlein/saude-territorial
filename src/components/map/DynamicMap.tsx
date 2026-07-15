"use client";

import dynamic from "next/dynamic";

const DynamicMap = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <p className="text-muted-foreground">Carregando mapa...</p>
    </div>
  ),
});

export default DynamicMap;
