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

export const loginFields: readonly FieldDefinition[] = [
  {
    name: "identifier",
    label: "Email or phone number",
    ariaLabel: "Email or phone number",
    placeholder: "you@example.com or +919876543210",
    type: "text",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    ariaLabel: "Password",
    placeholder: "Enter your password",
    type: "password",
    required: true,
    sensitive: true,
  },
];

export const registrationFields: readonly FieldDefinition[] = [
  {
    name: "name",
    label: "Full name",
    ariaLabel: "Full name",
    placeholder: "Enter your full name",
    type: "text",
    required: true,
  },
  {
    name: "email",
    label: "Email address",
    ariaLabel: "Email address",
    placeholder: "you@example.com",
    type: "email",
    required: true,
  },
  {
    name: "phone",
    label: "Phone number",
    ariaLabel: "Phone number",
    placeholder: "10-digit mobile or +91XXXXXXXXXX",
    type: "tel",
    required: true,
    hint: "Enter 10-digit Indian mobile number or with country code.",
  },
  {
    name: "password",
    label: "Password",
    ariaLabel: "Password",
    placeholder: "Enter password (at least 6 characters)",
    type: "password",
    required: true,
    sensitive: true,
  },
  {
    name: "role",
    label: "Account role",
    type: "select",
    options: ["ATHLETE", "ORGANIZER", "SCOUT"],
    optionLabels: {
      ATHLETE: "Athlete / Player",
      ORGANIZER: "Tournament Organizer",
      SCOUT: "Scout / Academy",
    },
    required: true,
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
