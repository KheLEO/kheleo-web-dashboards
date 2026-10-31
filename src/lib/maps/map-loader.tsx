"use client";
import dynamic from "next/dynamic";
import type { LeafletMapProps } from "./leaflet-map.client";
const Map = dynamic(() => import("./leaflet-map.client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});
export function MapLoader(props: LeafletMapProps) {
  return <Map {...props} />;
}
