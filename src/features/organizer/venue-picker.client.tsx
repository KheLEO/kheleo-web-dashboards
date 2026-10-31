"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import { tileUrl, tileAttribution } from "@/lib/maps/tile-config";
import "leaflet/dist/leaflet.css";
export interface VenuePickerProps {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}
function Pin({ latitude, longitude, onChange }: VenuePickerProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [map, latitude, longitude]);
  useMapEvents({
    click: (event) => {
      const point = event.latlng.wrap();
      if (point.lat >= -90 && point.lat <= 90)
        onChange(Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6)));
    },
  });
  return (
    <CircleMarker
      center={[latitude, longitude]}
      radius={10}
      pathOptions={{
        color: "rgb(var(--primary))",
        fillColor: "rgb(var(--primary))",
        fillOpacity: 0.7,
      }}
    />
  );
}
export default function VenuePicker(props: VenuePickerProps) {
  const [failed, setFailed] = useState(false);
  if (
    !Number.isFinite(props.latitude) ||
    !Number.isFinite(props.longitude) ||
    Math.abs(props.latitude) > 90 ||
    Math.abs(props.longitude) > 180
  )
    return <p role="status">Enter valid coordinates to place the venue pin.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Click the map to place the venue pin, or use the coordinate inputs. Both methods select the
        same venue.
      </p>
      {failed && (
        <p role="status" className="text-sm">
          Map tiles are unavailable. Coordinate inputs remain available.
        </p>
      )}
      <div
        aria-label="Venue location picker"
        className="relative z-0 h-80 overflow-hidden rounded-xl border"
      >
        <MapContainer center={[props.latitude, props.longitude]} zoom={12} scrollWheelZoom={false}>
          <TileLayer
            url={tileUrl}
            attribution={tileAttribution}
            eventHandlers={{ tileerror: () => setFailed(true) }}
          />
          <Pin {...props} />
        </MapContainer>
      </div>
    </div>
  );
}
