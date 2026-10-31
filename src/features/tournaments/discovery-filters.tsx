"use client";
import { useState } from "react";
import { SchemaForm } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { SportTypeValues } from "@/contracts/enums.generated";
import { nearbyQuerySchema, type NearbyTournamentsQuery } from "@/contracts/tournaments";
import { TournamentMap } from "@/lib/maps/tournament-map";
import { useNearby } from "./queries";
import { TournamentCard } from "./tournament-card";
export function TournamentDiscovery() {
  const [filters, setFilters] = useState<NearbyTournamentsQuery | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const query = useNearby(filters);
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Choose your search area</h2>
          <Button
            variant="secondary"
            onClick={() => {
              if (!navigator.geolocation) {
                setLocationError("Geolocation is unavailable. Enter coordinates below.");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  setLocationError(null);
                  setFilters({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    radius_km: 50,
                    limit: 20,
                  });
                },
                () =>
                  setLocationError(
                    "Location access was denied or unavailable. Enter coordinates below.",
                  ),
                { timeout: 10000, maximumAge: 60000 },
              );
            }}
          >
            Use my location
          </Button>
        </div>
        <SchemaForm
          fields={[
            {
              name: "lat",
              label: "Latitude",
              type: "number",
              valueType: "number",
              required: true,
              min: -90,
              max: 90,
            },
            {
              name: "lng",
              label: "Longitude",
              type: "number",
              valueType: "number",
              required: true,
              min: -180,
              max: 180,
            },
            {
              name: "radius_km",
              label: "Radius (km)",
              type: "number",
              valueType: "number",
              min: 1,
              max: 1000,
              step: "1",
            },
            { name: "sport", label: "Sport", type: "select", options: SportTypeValues },
          ]}
          schema={nearbyQuerySchema}
          defaults={{ radius_km: "50" }}
          submitLabel="Find nearby tournaments"
          successMessage="Search location updated."
          submit={async (value) => {
            setFilters({ ...value, limit: 20 });
          }}
        />
        {locationError && (
          <div className="mt-4">
            <Alert>{locationError}</Alert>
          </div>
        )}
      </Card>
      {!filters ? (
        <EmptyState>Choose a location to discover open tournaments.</EmptyState>
      ) : query.isFetching && !query.data ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        query.data && (
          <>
            <p className="text-xs text-muted-foreground">
              Showing up to 20 nearby results. Complete distance-based pagination awaits platform
              support.
            </p>
            <TournamentMap tournaments={query.data} center={[filters.lat, filters.lng]} />
            {query.data.length === 0 ? (
              <EmptyState>No open tournaments found in this area. Try a wider radius.</EmptyState>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {query.data.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
