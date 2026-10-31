"use client";
import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import { tileUrl, tileAttribution } from "./tile-config";
import "leaflet/dist/leaflet.css";
export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  value?: number;
  href?: string;
}
export interface LeafletMapProps {
  points: MapPoint[];
  center: [number, number];
  metric?: "gti" | "participation" | "equity";
}
export default function LeafletMap({ points, center, metric = "gti" }: LeafletMapProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div>
      {failed && (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          Map tiles could not load. Use the results below.
        </p>
      )}
      <div
        className="relative z-0 h-80 overflow-hidden rounded-xl border sm:h-96"
        aria-label="Geospatial results map"
      >
        <MapContainer key={center.join(":")} center={center} zoom={9} scrollWheelZoom={false}>
          <TileLayer
            attribution={tileAttribution}
            url={tileUrl}
            eventHandlers={{ tileerror: () => setFailed(true) }}
          />
          {points.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={
                point.value === undefined
                  ? 8
                  : Math.min(22, 5 + Math.sqrt(Math.max(0, point.value)))
              }
              pathOptions={{
                color: `rgb(var(--chart-${metric}))`,
                fillColor: `rgb(var(--chart-${metric}))`,
                fillOpacity: 0.45,
                weight: 2,
              }}
            >
              <Popup>
                {point.href ? (
                  <Link href={point.href}>{point.label}</Link>
                ) : (
                  <span>{point.label}</span>
                )}
                {point.value !== undefined && <p>{point.value}</p>}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
