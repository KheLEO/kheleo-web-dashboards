"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
import { SportTypeValues } from "@/contracts/enums.generated";
import { nearbyQuerySchema, type NearbyTournamentsQuery } from "@/contracts/tournaments";
import { TournamentMap } from "@/lib/maps/tournament-map";
import { useNearbyPages } from "./queries";
import { TournamentCard } from "./tournament-card";
export const campusLocations = [
  { name: "Ghaziabad / Delhi-NCR campus", lat: 28.6692, lng: 77.4538 },
  { name: "Central Delhi", lat: 28.6139, lng: 77.209 },
] as const;
export function TournamentDiscovery() {
  const [filters, setFilters] = useState<NearbyTournamentsQuery>({
    lat: 28.6692,
    lng: 77.4538,
    radius_km: 50,
    limit: 20,
  });
  const [lat, setLat] = useState("28.6692");
  const [lng, setLng] = useState("77.4538");
  const [radius, setRadius] = useState(50);
  const [sport, setSport] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const query = useNearbyPages(filters);
  const rows = Array.from(
    new Map(
      (query.data?.pages.flatMap((page) => page) ?? []).map((entry) => [entry.id, entry]),
    ).values(),
  );
  function search(): void {
    const result = nearbyQuerySchema.safeParse({
      lat: Number(lat),
      lng: Number(lng),
      radius_km: radius,
      limit: 20,
      ...(sport ? { sport } : {}),
    });
    if (!lat.trim() || !lng.trim() || !result.success) {
      setLocationError("Enter valid latitude and longitude coordinates.");
      return;
    }
    setLocationError(null);
    setFilters(result.data);
  }
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Choose your search area</h2>
          <Button
            variant="secondary"
            onClick={() => {
              if (!navigator.geolocation) {
                setLocationError("Location is unavailable. Use a campus or manual coordinates.");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setLat(String(position.coords.latitude));
                  setLng(String(position.coords.longitude));
                  setLocationError(null);
                  setFilters({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    radius_km: radius,
                    limit: 20,
                    ...(sport ? { sport: SportTypeValues.find((entry) => entry === sport) } : {}),
                  });
                },
                () =>
                  setLocationError(
                    "Location access was denied or unavailable. Ghaziabad coordinates remain available; choose a campus or enter your own.",
                  ),
                { timeout: 10000, maximumAge: 60000 },
              );
            }}
          >
            Use my location
          </Button>
        </div>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            search();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="field">
              Campus location
              <select
                className="control"
                defaultValue=""
                onChange={(event) => {
                  const campus = campusLocations.find((entry) => entry.name === event.target.value);
                  if (campus) {
                    setLat(String(campus.lat));
                    setLng(String(campus.lng));
                  }
                }}
              >
                <option value="">Manual coordinates</option>
                {campusLocations.map((campus) => (
                  <option key={campus.name}>{campus.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Sport
              <select
                className="control"
                value={sport}
                onChange={(event) => setSport(event.target.value)}
              >
                <option value="">All sports</option>
                {SportTypeValues.map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Latitude
              <input
                className="control"
                type="number"
                min={-90}
                max={90}
                step="any"
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                required
              />
            </label>
            <label className="field">
              Longitude
              <input
                className="control"
                type="number"
                min={-180}
                max={180}
                step="any"
                value={lng}
                onChange={(event) => setLng(event.target.value)}
                required
              />
            </label>
          </div>
          <label className="field">
            Search radius: {radius} km
            <input
              aria-label="Search radius"
              type="range"
              min={5}
              max={500}
              step={5}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="w-full accent-primary"
            />
          </label>
          <Button type="submit">Find nearby tournaments</Button>
        </form>
        {locationError && (
          <div className="mt-4">
            <Alert>{locationError}</Alert>
          </div>
        )}
      </Card>
      <p className="text-xs leading-5 text-muted-foreground">
        Cursor pages retain at most 100 results and remove duplicates. Distance ordering and the
        backend UUID cursor are inconsistent; additional pages are best effort, not an exhaustive
        geographic listing.
      </p>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <>
          <TournamentMap tournaments={rows} center={[filters.lat, filters.lng]} />
          {rows.length === 0 ? (
            <EmptyState>No open tournaments found in this area. Try a wider radius.</EmptyState>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
          <LoadMore
            hasNext={query.hasNextPage}
            loading={query.isFetchingNextPage}
            load={() => {
              void query.fetchNextPage();
            }}
          />
        </>
      )}
    </div>
  );
}
