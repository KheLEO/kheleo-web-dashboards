# Verified backend contracts

Source revision and schema checksum: [contracts/source.json](contracts/source.json). Schema snapshot: [contracts/schema.prisma](contracts/schema.prisma). Base path: `/api/v1`.

| Paths                                                     | Wire response                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `POST auth/register`, `auth/login`, `auth/refresh`        | Envelope of AuthResponse; server-only token handling                   |
| `POST auth/verify-government-id`                          | Envelope of message/verified/idHashPrefix                              |
| `GET auth/me`                                             | Envelope of JWT identity, not an athlete profile                       |
| `GET/PATCH/DELETE users/:id`                              | Envelope of selected user/contact fields                               |
| `GET/POST/PATCH passport/:userId`                         | Envelope of mapped athlete passport; numeric mapped Decimals           |
| `GET passport/:userId/sports`                             | Envelope of cursor page of raw sport records                           |
| `POST passport/:userId/sports`                            | Envelope of raw SportPassportRecord                                    |
| `GET tournaments/nearby`                                  | Envelope of location DTO array; `lat/lng/radius_km/sport/limit/cursor` |
| `GET tournaments/:id`                                     | Envelope of raw Tournament plus at most 100 brackets                   |
| `POST tournaments`                                        | Envelope of raw Tournament                                             |
| `GET tournaments/:id/brackets`                            | Envelope of cursor page of raw Bracket                                 |
| `POST tournaments/:id/brackets`                           | Envelope of raw Bracket                                                |
| `POST tournaments/:id/brackets/:bracketId/register`       | Envelope of mapped registration                                        |
| `POST .../free-agents/join`, `GET .../free-agents/status` | Envelope of queue status/optional matched roster                       |
| `DELETE .../free-agents/leave`                            | Envelope of message/cancelled                                          |
| `POST drills/submit`                                      | Bare success/posture_points_awarded/current_biomechanical_score        |
| `POST safety/telemetry-webhook`                           | Envelope of alert_triggered/status/optional message                    |
| `GET gti/rank/:sport/:athleteId`                          | Envelope of sport/athleteId/rank; optional district                    |
| `POST gti/recalculate/:athleteId`                         | Envelope of computation result                                         |
| `GET scouts/feed`                                         | Bare success/total/limit/next_cursor/data                              |
| `GET scouts/alerts`                                       | Envelope of latest 50 alerts plus selected athlete relation            |
| `PATCH scouts/alerts/:id/acknowledge`                     | Envelope of raw ScoutAlert                                             |
| `GET heatmaps/regional`                                   | Bare success/count/data                                                |

The global response interceptor skips objects already containing `success`. Never globally unwrap `data` recursively. Errors use RFC 7807 with optional validation and business-code extensions.

Cursor pages have `data`, `next_cursor`, `has_more`, and `count`. Brackets and sport records use `cursor_id`, default limit 20, maximum 100. Scout feed also uses `cursor_id` but omits `has_more`. Alerts and heatmaps expose no cursor metadata. Nearby's UUID predicate and distance ordering are inconsistent, so the frontend fetches one bounded result set.

Raw Prisma Decimal fields serialize as strings. Mapped passport/location/registration DTOs convert selected fields to numbers. Dates serialize as ISO strings. Generated scalar interfaces intentionally omit relations and unsupported PostGIS fields.

Registration conflicts preserve `SANDBAGGING_DETECTED`, `BELOW_MINIMUM_TIER`, actual GTI bounds, and nullable suggested bracket ID/tier. Capacity conflicts can have no code; do not classify every 409 as sandbagging. Fees are configuration, not evidence that the frontend collected payment.

## Realtime

- `/ws/matchmaking`: emit `join:user {userId}`, `join:bracket {bracketId}`. Receive `ROSTER_FORMED {event,data:{team_id,team_name,bracket_id,roster}}`.
- `/ws/events`: emit `join:athlete {athleteId}`, `join:tournament {tournamentId}`, `join:match {matchId}`. Receive bare `MATCH_PAUSE_ALERT` and `GTI_UPDATED` payloads.
- No leave-room message exists. There is no implemented scout-room join handler.
- The safety gateway currently also broadcasts globally. Production event subscriptions remain gated.

## Signing and idempotency

Protected mutations require Idempotency-Key, minimum 16 characters; this frontend uses UUIDs. Backend cache scope is method/route/key, body-fingerprinted, retained for 24 hours, with a 300-second processing lock. Use globally random operation IDs and never share operation objects between accounts.

`x-drill-signature` signs `userId:drill_type:form_score:timestamp`. `x-device-signature` signs the exact telemetry JSON. Freshness must be within 300 seconds. Signed freshness guards run before idempotency lookup, so expired requests cannot simply recover a cached result.

## Authorization

Public registration only creates ATHLETE. Scout endpoints accept SCOUT/FEDERATION_ADMIN/SUPER_ADMIN. Tournament creation accepts ORGANIZER/FEDERATION_ADMIN/SUPER_ADMIN. Passport reads allow self or scout/federation/admin; contact details are self/admin. The frontend relay adds organizer ownership checks before bracket creation and stricter private-sport-record reads.
