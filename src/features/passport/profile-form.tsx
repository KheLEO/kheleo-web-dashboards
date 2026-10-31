"use client";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { useSession } from "@/features/auth/session-provider";
import {
  createPassportSchema,
  updatePassportSchema,
  type AthletePassport,
} from "@/contracts/passport";
import { savePassport } from "./api";
import { profileFields } from "./schemas";
export function ProfileForm({ profile }: { profile?: AthletePassport }) {
  const { user } = useSession();
  const client = useQueryClient();
  const defaults: Record<string, string> = profile
    ? {
        dateOfBirth: profile.dateOfBirth.slice(0, 10),
        gender: profile.gender,
        primarySport: profile.primarySport,
        secondarySports: profile.secondarySports.join(", "),
        district: profile.district,
        state: profile.state,
        tierClassification: profile.tierClassification,
        heightCm: profile.physicalStats.heightCm?.toString() ?? "",
        weightKg: profile.physicalStats.weightKg?.toString() ?? "",
        dominantSide: profile.physicalStats.dominantSide ?? "",
      }
    : { isScoutSearchable: "true", tierClassification: "RURAL" };
  return (
    <SchemaForm
      fields={
        profile
          ? profileFields.filter((field) => !["dateOfBirth", "gender"].includes(field.name))
          : profileFields
      }
      schema={profile ? updatePassportSchema : createPassportSchema}
      defaults={defaults}
      submitLabel={profile ? "Save passport" : "Create sports passport"}
      submit={(_value, operation) => savePassport(user.id, operation, !profile)}
      onSuccess={() => {
        void client.invalidateQueries({ queryKey: ["passport", user.id] });
      }}
    />
  );
}
