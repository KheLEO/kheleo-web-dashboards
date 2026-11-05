# Verified backend contracts

Source revision and schema checksum: [contracts/source.json](contracts/source.json). Schema snapshot: [contracts/schema.prisma](contracts/schema.prisma). Base path: `/api/v1`.

| Paths                                                     | Wire response                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `POST auth/register`, `auth/login`, `auth/refresh`        | Envelope of AuthResponse; server-only token handling                       |
| `POST auth/verify-government-id`, `auth/verify-gov-id`    | Envelope of message/verified/idHashPrefix                                  |
| `POST auth/logout`                                        | Revokes all user refresh families                                          |
| `GET/POST/PATCH users/profile`                            | Authenticated passport alias                                               |
| `GET auth/me`                                             | Envelope of JWT identity, not an athlete profile                           |
| `GET/PATCH/DELETE users/:id`                              | Envelope of selected user/contact fields                                   |
| `GET/POST/PATCH passport/:userId`                         | Envelope of mapped athlete passport; numeric mapped Decimals               |
| `GET passport/:userId/sports`                             | Envelope of cursor page of raw sport records                               |
| `POST passport/:userId/sports`                            | Envelope of raw SportPassportRecord                                        |
| `GET tournaments/nearby`                                  | Envelope of `{ data, next_cursor, has_more }`; distance/UUID keyset cursor |
| `GET tournaments/:id`                                     | Envelope of raw Tournament plus at most 100 brackets                       |
| `POST tournaments`                                        | Envelope of raw Tournament                                                 |
| `GET tournaments/:id/brackets`                            | Envelope of cursor page of raw Bracket                                     |
| `POST tournaments/:id/brackets`                           | Envelope of raw Bracket                                                    |
| `POST tournaments/:id/brackets/:bracketId/register`       | Envelope of mapped registration                                            |
| `POST .../free-agents/join`, `GET .../free-agents/status` | Envelope of queue status/optional matched roster                           |
| `DELETE .../free-agents/leave`                            | Envelope of message/cancelled                                              |
| `POST drills/submit`                                      | Bare success/posture_points_awarded/current_biomechanical_score            |
| `POST safety/telemetry-webhook`                           | Envelope of alert_triggered/status/optional message                        |
| `GET gti/rank/:sport/:athleteId`                          | Envelope of sport/athleteId/rank; optional district                        |
| `POST gti/recalculate/:athleteId`                         | Envelope of computation result                                             |
| `GET scouts/feed`                                         | Bare success/total/limit/next_cursor/data                                  |
| `GET scouts/alerts`                                       | Envelope of latest 50 alerts plus selected athlete relation                |
| `PATCH scouts/alerts/:id/acknowledge`                     | Envelope of raw ScoutAlert                                                 |
| `GET heatmaps/regional`                                   | Bare success/count/data                                                    |

The global response interceptor skips objects already containing `success`. Never globally unwrap `data` recursively. Errors use RFC 7807 with optional validation and business-code extensions.

Cursor pages have `data`, `next_cursor`, `has_more`, and `count`. Brackets and sport records use `cursor_id`, default limit 20, maximum 100. Scout feed also uses `cursor_id` but omits `has_more`. Alerts and heatmaps expose no cursor metadata. Nearby uses `cursor` and exact `(distance_km ASC, id ASC)` ordering on both PostGIS and Haversine paths. Its client decoder also accepts legacy arrays.

Raw Prisma Decimal fields serialize as strings. Mapped passport/location/registration DTOs convert selected fields to numbers. Dates serialize as ISO strings. Generated scalar interfaces intentionally omit relations and unsupported PostGIS fields.

Registration conflicts preserve `SANDBAGGING_DETECTED`, `BELOW_MINIMUM_TIER`, actual GTI bounds, and nullable suggested bracket ID/tier. Capacity conflicts can have no code; do not classify every 409 as sandbagging. Fees are configuration, not evidence that the frontend collected payment.

## Realtime

- `/ws/matchmaking`: backend supports `join:user {userId}` and `join:bracket {bracketId}`. The frontend subscribes only to its authenticated personal user room and can join bracket rooms when membership or staff authorization is established. Receive `ROSTER_FORMED {event,data:{team_id,team_name,bracket_id,roster}}` and refetch the authorized pool state.
- `/ws/events`: emit `join:athlete {athleteId}`, `join:tournament {tournamentId}`, `join:match {matchId}`. Receive bare `MATCH_PAUSE_ALERT` and `GTI_UPDATED` payloads.
- No leave-room message exists. There is no implemented scout-room join handler.
- Both namespaces reject unauthenticated handshakes. Tournament/bracket/match joins require ownership, assigned umpire status, administration, or actual participant membership. Safety broadcasts target the athlete, supplied competition rooms, and authorized staff role rooms.

## Signing and idempotency

Protected mutations require Idempotency-Key, minimum 16 characters; this frontend uses UUIDs. Backend cache scope includes authenticated identity, method, route, and key, body-fingerprinted, retained for 24 hours, with a 300-second processing lock. Use globally random operation IDs and never share operation objects between accounts.

`x-drill-signature` uses FULL_V2 canonical JSON with sorted object keys. It covers athlete, sport, drill type, form score, frame count, flaw flags, joint summaries (including calibration version and pose digest), and timestamp. The relay verifies `x-client-pose-digest`, recalculates scoring from the landmark series, and forwards only the signed aggregate. `x-device-signature` signs the exact telemetry JSON. Freshness must be within 300 seconds. Signed freshness guards run before idempotency lookup, so expired requests cannot simply recover a cached result.

## Authorization

Public signup allows ATHLETE, ORGANIZER, and SCOUT. Organizers/scouts require a bound identity and remain UNVERIFIED until an administrator approves them. Pending staff cannot authenticate protected API or socket requests. Scout endpoints accept SCOUT/FEDERATION_ADMIN/SUPER_ADMIN. Tournament creation accepts ORGANIZER/FEDERATION_ADMIN/SUPER_ADMIN. Passport reads allow self or scout/federation/admin; contact details are self/admin. The frontend relay adds organizer ownership checks before bracket creation and stricter private-sport-record reads.

Self-service sport writes through the relay accept `sport`, `primaryRole`, and `secondaryRoles`. The backend DTO additionally accepts `verifiedMetrics` and `earnedBadges`, but the relay and backend service reject athlete-authored verified evidence. Only authorized organizers or federation/super admins may write verified fields. No separate self-reported stance field exists. On successful self-deactivation, the relay deletes the current web session before returning; the flow first calls upstream logout, while backend deactivation also revokes tokens transactionally. Logout removes the local session even if upstream revocation encounters a service failure, and reports that failure.

## Historical disclosure mapping before Prompt 1

The local six-page Kheleo Invention Disclosure Form was reviewed against backend revision `0067d9445048370c700f7b4bad8fa006cea43651`. The disclosure describes system goals rather than a complete, implemented API specification.

| Disclosure section                                                   | Verified implementation and remaining dependency                                                                                                                                                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page 3, section 12.1: permanent identity and reattachment            | `AuthService.register` restores an existing identity when the supplied contact matches; `IdentityService` prevents binding a different identity. The implemented route is `auth/verify-government-id`, not `auth/verify-gov-id`. |
| Pages 3–4, section 12.2: local pose analysis and reference technique | Local pose/joint-angle analysis is implemented. Approved reference models and scoring calibration are absent; production score ingestion stays disabled.                                                                         |
| Page 4, section 12.3: wearable safety and pause alerts               | `SafetyService.processTelemetry` applies HR > 195, SpO₂ < 90, temperature > 39.5. Full wearable services, authorized match context, per-athlete calibration and safe, durable organizer events remain dependencies.              |
| Page 4, section 12.4: fair bracket assignment                        | `BracketsService.registerForBracket` returns `409 SANDBAGGING_DETECTED` and an optional suggested higher bracket. The UI requires confirmation before a new registration; no automatic reassignment endpoint exists.             |
| Page 4, section 12.5: complementary teams                            | Tournament/bracket-scoped free-agent APIs and `ROSTER_FORMED` payloads exist. The frontend uses only authorized personal rooms; unrestricted backend bracket subscriptions still require remediation.                            |
| Page 4, section 12.6: GTI and scouting                               | Backend weights are 0.35 / 0.25 / 0.40; elite threshold is ≥85. Feed and individual ranks exist. National/state leaderboard lists, season history and outreach/trial APIs are absent.                                            |
| Page 5, planned extensions: regional participation maps              | `heatmaps/regional` supplies bounded district aggregates. Completeness and state-disambiguation contracts remain pending.                                                                                                        |

No live PostgreSQL, Redis, BullMQ, physical wearable, identity authority, or production Socket.io verification is implied by this source audit. The repository's deterministic fixtures validate frontend behavior against known wire shapes.
