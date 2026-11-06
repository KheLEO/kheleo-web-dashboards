// Generated from the committed backend schema snapshot.
export const UserRoleValues = [
  "ATHLETE",
  "SCOUT",
  "UMPIRE",
  "ORGANIZER",
  "FEDERATION_ADMIN",
  "SUPER_ADMIN",
] as const;
export type UserRole = (typeof UserRoleValues)[number];

export const GovIdTypeValues = [
  "AADHAAR",
  "VOTER_ID",
  "PASSPORT",
  "DRIVING_LICENSE",
  "BIRTH_CERTIFICATE",
] as const;
export type GovIdType = (typeof GovIdTypeValues)[number];

export const VerificationStatusValues = [
  "UNVERIFIED",
  "VERIFIED",
  "FLAGGED_DUPLICATE",
  "REVOKED",
] as const;
export type VerificationStatus = (typeof VerificationStatusValues)[number];

export const SportTypeValues = [
  "CRICKET",
  "FOOTBALL",
  "BADMINTON",
  "ATHLETICS",
  "BASKETBALL",
  "KABADDI",
] as const;
export type SportType = (typeof SportTypeValues)[number];

export const TierClassificationValues = ["RURAL", "TIER_3", "TIER_2", "TIER_1", "METRO"] as const;
export type TierClassification = (typeof TierClassificationValues)[number];

export const TournamentStatusValues = [
  "DRAFT",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "SUSPENDED",
] as const;
export type TournamentStatus = (typeof TournamentStatusValues)[number];

export const BracketTypeValues = [
  "SINGLE_ELIMINATION",
  "DOUBLE_ELIMINATION",
  "ROUND_ROBIN",
  "SWISS",
] as const;
export type BracketType = (typeof BracketTypeValues)[number];

export const MatchStatusValues = [
  "SCHEDULED",
  "WARMUP",
  "LIVE",
  "PAUSED_SAFETY",
  "COMPLETED",
  "ABANDONED",
] as const;
export type MatchStatus = (typeof MatchStatusValues)[number];

export const FreeAgentStatusValues = [
  "QUEUED",
  "MATCHING",
  "MATCHED",
  "CANCELLED",
  "EVALUATING",
  "EXPIRED",
  "WITHDRAWN",
] as const;
export type FreeAgentStatus = (typeof FreeAgentStatusValues)[number];

export const DrillVerificationStatusValues = [
  "VALID",
  "INVALID_SIGNATURE",
  "ANOMALOUS_METRICS",
  "REJECTED_OUT_OF_BOUNDS",
] as const;
export type DrillVerificationStatus = (typeof DrillVerificationStatusValues)[number];

export const AlertSeverityValues = ["NORMAL", "WARNING", "CRITICAL"] as const;
export type AlertSeverity = (typeof AlertSeverityValues)[number];

export const RegistrationStatusValues = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "REJECTED_SANDBAGGING",
] as const;
export type RegistrationStatus = (typeof RegistrationStatusValues)[number];

export const AuditCategoryValues = [
  "GOV_ID_RESET",
  "DRILL_HMAC_TAMPER",
  "SANDBAGGING_BLOCKED",
  "SAFETY_MATCH_PAUSE",
  "ROLE_GOVERNANCE",
  "TOURNAMENT_MODERATION",
  "SYSTEM_EVENT",
] as const;
export type AuditCategory = (typeof AuditCategoryValues)[number];

export const AuditSeverityValues = ["INFO", "WARNING", "CRITICAL"] as const;
export type AuditSeverity = (typeof AuditSeverityValues)[number];

export const DrillSignatureVersionValues = ["LEGACY", "FULL", "FULL_V2"] as const;
export type DrillSignatureVersion = (typeof DrillSignatureVersionValues)[number];

export const TelemetrySourceValues = ["DEVICE_HMAC", "ATHLETE_JWT", "BLE", "SIMULATOR"] as const;
export type TelemetrySource = (typeof TelemetrySourceValues)[number];
