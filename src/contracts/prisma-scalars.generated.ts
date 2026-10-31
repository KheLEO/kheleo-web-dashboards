// Schema references only. Relations and unsupported geometry are excluded.
import type { ISODateString, DecimalString, JsonValue } from "./common";
import type {
  UserRole,
  GovIdType,
  VerificationStatus,
  SportType,
  TierClassification,
  TournamentStatus,
  BracketType,
  MatchStatus,
  FreeAgentStatus,
  AlertSeverity,
  RegistrationStatus,
} from "./enums.generated";

export interface UserScalar {
  id: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RefreshTokenScalar {
  id: string;
  userId: string;
  tokenHash: string;
  family: string;
  revoked: boolean;
  expiresAt: ISODateString;
  createdAt: ISODateString;
}

export interface IdentityVerificationScalar {
  id: string;
  userId: string;
  idHash: string;
  idType: GovIdType;
  saltVersion: number;
  status: VerificationStatus;
  reLinkedCount: number;
  historicalUserIds: string[];
  verifiedAt: ISODateString;
  metadata: JsonValue | null;
}

export interface AthleteProfileScalar {
  id: string;
  userId: string;
  dateOfBirth: ISODateString;
  gender: string;
  primarySport: SportType;
  secondarySports: SportType[];
  district: string;
  state: string;
  tierClassification: TierClassification;
  heightCm: DecimalString | null;
  weightKg: DecimalString | null;
  dominantSide: string | null;
  locationLat: number | null;
  locationLng: number | null;
  currentGti: DecimalString;
  gti: number;
  biomechanicalScore: number;
  trainingConsistencyScore: number;
  matchPerformanceScore: number;
  isRuralOrUnderrepresented: boolean;
  posturePoints: number;
  wearableScore: DecimalString;
  matchPerfScore: DecimalString;
  isScoutSearchable: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SportPassportRecordScalar {
  id: string;
  athleteId: string;
  sport: SportType;
  primaryRole: string;
  secondaryRoles: string[];
  totalMatches: number;
  winCount: number;
  winStreak: number;
  verifiedMetrics: JsonValue;
  earnedBadges: JsonValue;
  updatedAt: ISODateString;
}

export interface TournamentScalar {
  id: string;
  organizerId: string;
  name: string;
  title: string;
  sport: SportType;
  status: TournamentStatus;
  minGti: DecimalString;
  maxGti: DecimalString;
  maxTeams: number;
  teamSize: number;
  prizePool: DecimalString;
  currency: string;
  venueName: string;
  venueLat: number;
  venueLng: number;
  registrationDeadline: ISODateString;
  startDate: ISODateString;
  endDate: ISODateString;
  rulesConfig: JsonValue;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface BracketScalar {
  id: string;
  tournamentId: string;
  name: string;
  tierName: string;
  minGti: DecimalString;
  maxGti: DecimalString;
  entryFee: DecimalString;
  maxTeams: number;
  bracketType: BracketType;
  roundOrder: number;
  config: JsonValue;
}

export interface RegistrationScalar {
  id: string;
  bracketId: string;
  userId: string | null;
  teamId: string | null;
  status: RegistrationStatus;
  feePaid: DecimalString;
  registeredAt: ISODateString;
  metadata: JsonValue | null;
}

export interface TeamScalar {
  id: string;
  tournamentId: string;
  bracketId: string | null;
  name: string;
  captainId: string | null;
  isFreeAgentTeam: boolean;
  isFreeAgentFormed: boolean;
  compositeGti: DecimalString;
  averageGti: number;
  registrationDate: ISODateString;
  createdAt: ISODateString;
}

export interface TeamMemberScalar {
  id: string;
  teamId: string;
  athleteId: string | null;
  userId: string | null;
  role: string | null;
  assignedRole: string;
  isCaptain: boolean;
  joinedAt: ISODateString;
}

export interface FreeAgentRegistrationScalar {
  id: string;
  userId: string;
  tournamentId: string;
  bracketId: string;
  sport: string;
  primaryRole: string;
  secondaryRole: string | null;
  status: FreeAgentStatus;
  matchedTeamId: string | null;
  joinedAt: ISODateString;
}

export interface FreeAgentPoolScalar {
  id: string;
  tournamentId: string;
  athleteId: string;
  sport: SportType;
  preferredRole: string;
  secondaryRoles: string[];
  athleteGti: DecimalString;
  status: FreeAgentStatus;
  queuedAt: ISODateString;
  matchedAt: ISODateString | null;
  matchedTeamId: string | null;
}

export interface MatchScalar {
  id: string;
  bracketId: string;
  round: number;
  matchNumber: number;
  teamAId: string;
  teamBId: string;
  umpireId: string | null;
  scheduledStart: ISODateString;
  status: MatchStatus;
  winnerTeamId: string | null;
  scoreSummary: JsonValue;
  pauseReason: string | null;
  pausedAt: ISODateString | null;
}

export interface DrillSubmissionScalar {
  id: string;
  athleteId: string;
  sport: string;
  drillType: string;
  formScore: number;
  framesAnalyzed: number;
  flawFlags: JsonValue;
  jointAnglesSummary: JsonValue;
  signatureHash: string;
  createdAt: ISODateString;
}

export interface HealthAlertScalar {
  id: string;
  athleteId: string;
  tournamentId: string | null;
  bracketId: string | null;
  severity: AlertSeverity;
  heartRate: number;
  spo2: number;
  skinTemperature: number;
  triggerReason: string;
  matchPaused: boolean;
  createdAt: ISODateString;
}

export interface ScoutAlertScalar {
  id: string;
  athleteId: string;
  gtiScore: number;
  district: string;
  sport: string;
  isAcknowledged: boolean;
  createdAt: ISODateString;
}

export interface GtiHistoryScalar {
  id: string;
  athleteId: string;
  biomechanicalScore: DecimalString;
  wearableScore: DecimalString;
  matchScore: DecimalString;
  compositeGti: DecimalString;
  calculationFactors: JsonValue;
  calculatedAt: ISODateString;
}

export interface ScoutDossierScalar {
  id: string;
  athleteId: string;
  scoutId: string;
  scoutNotes: string;
  federationTag: string | null;
  isShortlisted: boolean;
  pipelineStatus: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface IdempotencyRecordScalar {
  id: string;
  key: string;
  userId: string | null;
  route: string;
  responseCode: number;
  responseBody: JsonValue;
  createdAt: ISODateString;
  expiresAt: ISODateString;
}
