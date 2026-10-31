export const adminRequirements = {
  organizers: {
    title: "Organizer verification",
    description:
      "Organizer verification requires an authorized review queue and decision API. These are not available in the current platform.",
  },
  tournaments: {
    title: "Tournament moderation",
    description:
      "Platform-wide tournament moderation requires paginated event listing, moderation actions, and audit records.",
  },
  "identity-audit": {
    title: "Duplicate identity audits",
    description:
      "Identity audit records require a dedicated, access-controlled projection. Government identity hashes are not exposed here.",
  },
  "security-audit": {
    title: "Drill security audits",
    description:
      "Persistent HMAC rejection and anti-tamper audit endpoints are required before this view can display verified records.",
  },
  system: {
    title: "Platform health monitoring",
    description:
      "Database, Redis, BullMQ, and backend health require dedicated monitoring endpoints. A working web session does not establish platform health.",
  },
} as const;
