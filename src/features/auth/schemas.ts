import type { FieldDefinition } from "@/components/ui/form";
import { GovIdTypeValues } from "@/contracts/enums.generated";
export const identityFields: readonly FieldDefinition[] = [
  {
    name: "idType",
    label: "Government document",
    type: "select",
    options: GovIdTypeValues,
    required: true,
  },
  {
    name: "idNumber",
    label: "Government ID number",
    type: "password",
    required: true,
    sensitive: true,
    hint: "Used only for identity proof. Never stored in this browser.",
  },
];
export const authFields: readonly FieldDefinition[] = [
  { name: "email", label: "Email", type: "email", hint: "Provide your email or phone number." },
  {
    name: "phone",
    label: "Phone number",
    type: "tel",
    hint: "Include the country code, e.g. +91.",
  },
  ...identityFields.map((field) => ({ ...field, name: `governmentId.${field.name}` })),
];
