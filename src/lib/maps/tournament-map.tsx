"use client";
import type { TournamentLocation } from "@/contracts/tournaments";
import { MapLoader } from "./map-loader";
export function TournamentMap({
  tournaments,
  center,
}: {
  tournaments: TournamentLocation[];
  center: [number, number];
}) {
  return (
    <MapLoader
      center={center}
      points={tournaments.map((t) => ({
        id: t.id,
        lat: t.venueLat,
        lng: t.venueLng,
        label: t.name,
        href: `/athlete/tournaments/${t.id}`,
      }))}
    />
  );
}
