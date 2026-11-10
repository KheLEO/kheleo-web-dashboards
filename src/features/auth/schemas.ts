import type { FieldDefinition } from "@/components/ui/form";

export const identityFields: readonly FieldDefinition[] = [
  {
    name: "idNumber",
    label: "Aadhaar number",
    ariaLabel: "Government ID number",
    placeholder: "Enter 12-digit Aadhaar number",
    type: "password",
    required: true,
    sensitive: true,
    hint: "Used only for one-time cryptographic hash verification. Never stored in plaintext.",
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
