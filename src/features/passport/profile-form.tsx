"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Navigation, MapPin, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSession } from "@/features/auth/session-provider";
import {
  createPassportSchema,
  updatePassportSchema,
  type AthletePassport,
} from "@/contracts/passport";
import { SportTypeValues, type SportType } from "@/contracts/enums.generated";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { asApiError } from "@/lib/api/errors";
import { createOperation } from "@/lib/api/operation";
import {
  INDIA_STATES,
  getDistrictsForState,
  getDistrictCoordinates,
  PRESET_SPORTS_HUBS,
} from "@/lib/india-locations";
import { savePassport } from "./api";

const SPORT_LABELS: Record<SportType, string> = {
  CRICKET: "Cricket",
  FOOTBALL: "Football",
  BADMINTON: "Badminton",
  ATHLETICS: "Athletics",
  BASKETBALL: "Basketball",
  KABADDI: "Kabaddi",
};

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "NON_BINARY", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
] as const;

const TIER_OPTIONS = [
  { value: "RURAL", label: "Rural / Village" },
  { value: "TIER_3", label: "Tier 3 (Emerging Town / District)" },
  { value: "TIER_2", label: "Tier 2 (Regional City)" },
  { value: "TIER_1", label: "Tier 1 (Metro / Capital)" },
] as const;

const STANCE_OPTIONS = [
  { value: "RIGHT", label: "Right-handed / Right-footed" },
  { value: "LEFT", label: "Left-handed / Left-footed" },
  { value: "AMBIDEXTROUS", label: "Ambidextrous / Both sides" },
] as const;

interface FormValues {
  dateOfBirth: string;
  gender: string;
  primarySport: SportType | "";
  secondarySports: SportType[];
  state: string;
  district: string;
  tierClassification: string;
  heightCm: string;
  weightKg: string;
  dominantSide: string;
  locationLat: string;
  locationLng: string;
  isScoutSearchable: "true" | "false";
}

export function ProfileForm({ profile }: { profile?: AthletePassport }) {
  const { user } = useSession();
  const client = useQueryClient();
  const isHydrated = useHydrated();

  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsCaptured, setGpsCaptured] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [showCoordinateInputs, setShowCoordinateInputs] = useState(false);

  // Normalize initial dominantSide value ("BOTH" -> "AMBIDEXTROUS")
  const initialDominantSide =
    profile?.physicalStats.dominantSide === "BOTH"
      ? "AMBIDEXTROUS"
      : (profile?.physicalStats.dominantSide ?? "");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      dateOfBirth: profile?.dateOfBirth?.slice(0, 10) ?? "",
      gender: profile?.gender ?? "",
      primarySport: (profile?.primarySport as SportType) ?? "",
      secondarySports: (profile?.secondarySports as SportType[]) ?? [],
      state: profile?.state ?? "",
      district: profile?.district ?? "",
      tierClassification: profile?.tierClassification ?? "RURAL",
      heightCm: profile?.physicalStats.heightCm?.toString() ?? "",
      weightKg: profile?.physicalStats.weightKg?.toString() ?? "",
      dominantSide: initialDominantSide,
      locationLat: "",
      locationLng: "",
      isScoutSearchable: profile?.isScoutSearchable === false ? "false" : "true",
    },
  });

  const formValues = useWatch({ control });
  const selectedState = formValues?.state ?? "";
  const selectedDistrict = formValues?.district ?? "";
  const selectedPrimarySport = formValues?.primarySport ?? "";
  const selectedSecondarySports = formValues?.secondarySports ?? [];
  const currentLat = formValues?.locationLat ?? "";
  const currentLng = formValues?.locationLng ?? "";

  // Available districts for the selected state (including current profile district if legacy)
  const stateDistricts = getDistrictsForState(selectedState);
  const availableDistricts =
    profile?.district &&
    selectedState === profile.state &&
    !stateDistricts.includes(profile.district)
      ? [profile.district, ...stateDistricts]
      : stateDistricts;

  // Background coordinate fallback based on State & District when GPS hasn't been explicitly captured
  useEffect(() => {
    if (!gpsCaptured && (selectedState || selectedDistrict)) {
      const coords = getDistrictCoordinates(selectedState, selectedDistrict);
      setValue("locationLat", coords.lat.toString());
      setValue("locationLng", coords.lng.toString());
    }
  }, [selectedState, selectedDistrict, gpsCaptured, setValue]);

  // Handle GPS button click
  const handleDetectGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        setValue("locationLat", lat.toString());
        setValue("locationLng", lng.toString());
        setGpsCaptured(true);
        setDetectingGps(false);
      },
      (error) => {
        setDetectingGps(false);
        setGpsError(
          error.code === 1
            ? "Location permission denied. Approximate coordinates set from your State & District."
            : "Could not retrieve GPS location. Approximate coordinates set from your State & District.",
        );
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  };

  // Handle state change with district reset
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setValue("state", newState);
    const newDistricts = getDistrictsForState(newState);
    if (!newDistricts.includes(selectedDistrict)) {
      setValue("district", "");
    }
    if (!gpsCaptured) {
      const coords = getDistrictCoordinates(newState, "");
      setValue("locationLat", coords.lat.toString());
      setValue("locationLng", coords.lng.toString());
    }
  };

  // Handle district change
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrict = e.target.value;
    setValue("district", newDistrict);
    if (!gpsCaptured) {
      const coords = getDistrictCoordinates(selectedState, newDistrict);
      setValue("locationLat", coords.lat.toString());
      setValue("locationLng", coords.lng.toString());
    }
  };

  // Handle preset sports hub selection
  const handleSelectPresetHub = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hubName = e.target.value;
    const hub = PRESET_SPORTS_HUBS.find((h) => h.name === hubName);
    if (hub) {
      setValue("state", hub.state);
      setValue("district", hub.district);
      setValue("locationLat", hub.lat.toString());
      setValue("locationLng", hub.lng.toString());
      setGpsCaptured(true);
    }
  };

  // Toggle secondary sports chips (excluding primary sport)
  const toggleSecondarySport = (sport: SportType) => {
    const current = selectedSecondarySports;
    if (current.includes(sport)) {
      setValue(
        "secondarySports",
        current.filter((s) => s !== sport),
      );
    } else {
      setValue("secondarySports", [...current, sport]);
    }
  };

  // Submit handler
  const onSubmit = async (values: FormValues) => {
    setMessage(null);
    setFailure(null);

    const payload: Record<string, unknown> = {};

    if (values.dateOfBirth) payload.dateOfBirth = values.dateOfBirth;
    if (values.gender) payload.gender = values.gender;
    if (values.primarySport) payload.primarySport = values.primarySport;
    if (values.state) payload.state = values.state;
    if (values.district) payload.district = values.district;
    if (values.tierClassification) payload.tierClassification = values.tierClassification;

    // Filter out primary sport from secondary sports before sending
    const validSecondary = (values.secondarySports ?? []).filter((s) => s !== values.primarySport);
    if (validSecondary.length > 0) {
      payload.secondarySports = validSecondary;
    }

    if (values.heightCm) payload.heightCm = Number(values.heightCm);
    if (values.weightKg) payload.weightKg = Number(values.weightKg);
    if (values.dominantSide) payload.dominantSide = values.dominantSide;

    if (values.locationLat) payload.locationLat = Number(values.locationLat);
    if (values.locationLng) payload.locationLng = Number(values.locationLng);

    payload.isScoutSearchable = values.isScoutSearchable === "true";

    const schema = profile ? updatePassportSchema : createPassportSchema;
    const result = schema.safeParse(payload);

    if (!result.success) {
      setFailure(
        result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" · "),
      );
      return;
    }

    try {
      const operation = createOperation(result.data);
      await savePassport(user.id, operation, !profile);
      setMessage(
        profile ? "Sports passport updated successfully." : "Sports passport created successfully.",
      );
      void client.invalidateQueries({ queryKey: ["passport", user.id] });
      void client.invalidateQueries({ queryKey: ["sports", user.id] });
    } catch (err: unknown) {
      setFailure(asApiError(err).message);
    }
  };

  // Secondary sports available to choose (filtering out the selected primary sport)
  const availableSecondarySports = SportTypeValues.filter(
    (sport) => sport !== selectedPrimarySport,
  );

  return (
    <form
      data-hydrated={isHydrated ? "true" : "false"}
      aria-busy={!isHydrated || isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {/* STATE FIRST */}
        <div className="field">
          <label htmlFor="state">State / Union Territory</label>
          <select
            id="state"
            className="control"
            value={selectedState}
            onChange={handleStateChange}
            disabled={!isHydrated || isSubmitting}
            required
          >
            <option value="">Select state / union territory…</option>
            {INDIA_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* CASCADING DISTRICT SECOND */}
        <div className="field">
          <label htmlFor="district">District</label>
          <select
            id="district"
            className="control"
            value={selectedDistrict}
            onChange={handleDistrictChange}
            disabled={!isHydrated || isSubmitting || !selectedState}
            required
          >
            <option value="">
              {!selectedState ? "Select a state first..." : "Select district…"}
            </option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {!selectedState && (
            <span className="text-xs font-normal leading-5 text-muted-foreground">
              Choose your state above to view official districts.
            </span>
          )}
        </div>

        {/* HOME LOCATION (GPS AUTO-DETECT + MANUAL OPTION) */}
        <div className="col-span-full rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Home Location (For Nearby Tournaments)</h3>
                <p className="text-xs text-muted-foreground">
                  Used only to discover tournaments within your travel radius. Coordinates are
                  approximate and never exposed publicly.
                </p>
              </div>
            </div>
            {gpsCaptured && currentLat && currentLng && (
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1.5 px-3 py-1 text-xs font-semibold">
                <Check size={13} />
                Location captured via GPS ({Number(currentLat).toFixed(2)}° N,{" "}
                {Number(currentLng).toFixed(2)}° E)
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={handleDetectGps}
              disabled={!isHydrated || detectingGps || isSubmitting}
              className="gap-2 text-xs"
            >
              <Navigation size={14} className={detectingGps ? "animate-spin" : ""} />
              {detectingGps ? "Detecting GPS location…" : "Use My Current Location (GPS)"}
            </Button>

            {!gpsCaptured && currentLat && currentLng && (
              <span className="text-xs text-muted-foreground">
                Approximate district center: {Number(currentLat).toFixed(2)}° N,{" "}
                {Number(currentLng).toFixed(2)}° E
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowManualLocation((prev) => !prev)}
              className="text-xs text-primary underline hover:text-primary/80 transition-colors ml-auto flex items-center gap-1"
            >
              <span>Or set location manually (Optional)</span>
              {showManualLocation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {gpsError && <p className="text-xs text-amber-500 leading-normal">{gpsError}</p>}

          {/* MANUAL LOCATION COLLAPSIBLE */}
          {showManualLocation && (
            <div className="mt-3 pt-3 border-t border-primary/20 space-y-3">
              <div className="field">
                <label htmlFor="preset-hub">Preset Stadium / Sports Hub</label>
                <select
                  id="preset-hub"
                  className="control text-xs"
                  onChange={handleSelectPresetHub}
                  disabled={!isHydrated || isSubmitting}
                >
                  <option value="">Select a nearby sports complex / stadium hub…</option>
                  {PRESET_SPORTS_HUBS.map((hub) => (
                    <option key={hub.name} value={hub.name}>
                      {hub.name} ({hub.district}, {hub.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowCoordinateInputs((prev) => !prev)}
                  className="text-[11px] text-muted-foreground underline hover:text-foreground"
                >
                  {showCoordinateInputs
                    ? "Hide coordinate fields"
                    : "Advanced: View / edit coordinates"}
                </button>
              </div>

              {showCoordinateInputs && (
                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  <div className="field">
                    <label htmlFor="locationLat">Latitude</label>
                    <input
                      id="locationLat"
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      className="control text-xs"
                      placeholder="e.g. 22.78"
                      {...register("locationLat")}
                      disabled={!isHydrated || isSubmitting}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="locationLng">Longitude</label>
                    <input
                      id="locationLng"
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      className="control text-xs"
                      placeholder="e.g. 86.18"
                      {...register("locationLng")}
                      disabled={!isHydrated || isSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PRIMARY SPORT WITH FRIENDLY LABELS */}
        <div className="field">
          <label htmlFor="primarySport">Primary sport</label>
          <select
            id="primarySport"
            className="control"
            {...register("primarySport")}
            disabled={!isHydrated || isSubmitting}
            required
          >
            <option value="">Select primary sport…</option>
            {SportTypeValues.map((sport) => (
              <option key={sport} value={sport}>
                {SPORT_LABELS[sport]}
              </option>
            ))}
          </select>
        </div>

        {/* DOMINANT HAND / STANCE */}
        <div className="field">
          <label htmlFor="dominantSide">Dominant Hand / Stance</label>
          <select
            id="dominantSide"
            className="control"
            {...register("dominantSide")}
            disabled={!isHydrated || isSubmitting}
          >
            <option value="">Select stance…</option>
            {STANCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* OTHER SPORTS (MULTI-SELECT TOGGLE CHIPS) */}
        <div className="col-span-full">
          <label className="block text-sm font-medium mb-2">
            Other sports (Select any you play)
          </label>
          <div className="flex flex-wrap gap-2">
            {availableSecondarySports.map((sport) => {
              const active = selectedSecondarySports.includes(sport);
              return (
                <button
                  type="button"
                  key={sport}
                  onClick={() => toggleSecondarySport(sport)}
                  disabled={!isHydrated || isSubmitting}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "border-primary bg-primary/15 text-primary font-semibold shadow-sm"
                      : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  aria-pressed={active}
                >
                  {active && <Check size={12} className="text-primary" />}
                  <span>{SPORT_LABELS[sport]}</span>
                </button>
              );
            })}
          </div>
          <span className="text-xs font-normal leading-5 text-muted-foreground mt-1.5 block">
            Click to toggle sports. You can track multi-sport tournament scores and records.
          </span>
        </div>

        {/* GENDER */}
        <div className="field">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            className="control"
            {...register("gender")}
            disabled={!isHydrated || isSubmitting}
            required
          >
            <option value="">Select gender…</option>
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* DATE OF BIRTH */}
        <div className="field">
          <label htmlFor="dateOfBirth">Date of birth</label>
          <input
            id="dateOfBirth"
            type="date"
            className="control"
            {...register("dateOfBirth")}
            disabled={!isHydrated || isSubmitting}
            required
          />
        </div>

        {/* REGIONAL CLASSIFICATION */}
        <div className="field">
          <label htmlFor="tierClassification">Regional classification</label>
          <select
            id="tierClassification"
            className="control"
            {...register("tierClassification")}
            disabled={!isHydrated || isSubmitting}
          >
            {TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* SCOUT SEARCH VISIBILITY */}
        <div className="field">
          <label htmlFor="isScoutSearchable">Appear in scout search</label>
          <select
            id="isScoutSearchable"
            className="control"
            {...register("isScoutSearchable")}
            disabled={!isHydrated || isSubmitting}
          >
            <option value="true">
              Yes — Make my profile visible to verified Scouts & Academies
            </option>
            <option value="false">No — Keep my profile private</option>
          </select>
        </div>

        {/* HEIGHT (CM) */}
        <div className="field">
          <label htmlFor="heightCm">Height (cm)</label>
          <input
            id="heightCm"
            type="number"
            min={50}
            max={260}
            placeholder="e.g. 175"
            className="control"
            {...register("heightCm")}
            disabled={!isHydrated || isSubmitting}
          />
        </div>

        {/* WEIGHT (KG) */}
        <div className="field">
          <label htmlFor="weightKg">Weight (kg)</label>
          <input
            id="weightKg"
            type="number"
            min={20}
            max={200}
            placeholder="e.g. 68"
            className="control"
            {...register("weightKg")}
            disabled={!isHydrated || isSubmitting}
          />
        </div>
      </div>

      {failure && <Alert danger>{failure}</Alert>}
      {message && <Alert>{message}</Alert>}

      <Button type="submit" disabled={!isHydrated || isSubmitting}>
        {isSubmitting ? "Saving…" : profile ? "Save passport" : "Create sports passport"}
      </Button>
    </form>
  );
}
