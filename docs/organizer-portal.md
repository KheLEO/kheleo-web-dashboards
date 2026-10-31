# Organizer portal and Phase 2 acceptance

Backend source remains revision `0067d94`; no backend files are changed. The Phase 2 baseline passed contract checks, lint, strict type checking, 65 unit/integration tests and 19 Chromium journeys before organizer implementation began.

## Phase 2 audit

- Athlete dashboard, passport, discovery, matchmaking, drills and IoT routes exist and compile.
- Registration distinguishes `409 SANDBAGGING_DETECTED` from capacity/minimum-tier/transport failures and uses the backend's suggested bracket for upgrade registration.
- Matchmaking uses the actual nested `ROSTER_FORMED` contract, authoritative status refetch, bounded deduplication and namespace cleanup.
- Drill HMAC-SHA256 signs the real colon-delimited backend format in the server relay. Shared secrets remain server-only. Provisional practice ingestion remains restricted to isolated staging; production scoring is unavailable pending approved calibration.
- Bluetooth uses Heart Rate Service `0x180D` and characteristic `0x2A37`. The standard characteristic provides neither SpO₂ nor temperature. Hardware ingestion remains blocked; labeled simulation is local outside isolated staging.

## Hosting workflow

`/organizer/dashboard` is a protected overview, and `/organizer/tournaments/create` opens the same creation wizard as `/organizer/tournaments/new`. The four steps validate event details/dates, venue, capacity/prize/GTI range and final review. Local datetime inputs become ISO strings at submission. Leaflet pin clicks and coordinate inputs share one form draft. Map failures preserve manual coordinate entry.

Creation sends only `CreateTournamentDto` fields. Custom sports, editable rules, payout allocations and quotas are excluded because they are not accepted by the backend. An event-level prize pool is configuration, not payment distribution. The created event opens by its returned UUID.

The bracket workspace and `/brackets/new` support up to ten editable tier drafts. Grassroots, intermediate and elite templates are starting points, with inclusive GTI boundaries clearly described. Each tier has its own stable operation UUID/body and independent save state. A retry after a transient failure preserves the operation. Saved tiers become read-only; unsaved drafts can be removed without implying backend deletion. Existing bracket lists use the existing 20-row/five-page cursor adapter.

The relay verifies organizer ownership before bracket writes. The safety view checks event ownership before mounting its subscription or preview. Other organizer accounts cannot use the frontend to modify a foreign event. Backend ownership enforcement remains a release dependency because frontend checks do not protect direct upstream requests.

## Safety workflow

`/organizer/safety` accepts a known tournament UUID; event-specific safety URLs remain supported. A normal/warning/critical wall for every active athlete cannot be built from the current alert-only gateway. The page instead shows latest **observed alert samples**, clearly separated by LIVE/SIMULATED source. Sparse heart-rate charts do not represent continuous monitoring or safety clearance.

`SAFE_EVENTS_VERIFIED=false` keeps production subscriptions disabled. If operators independently verify the backend isolation repairs, the existing events namespace rejoins the active tournament room, validates payloads, filters tournament context and coalesces duplicate delivery. Alerts without tournament context cannot be attributed to this workspace and are not displayed. Missing or disconnected streams mean unknown safety state.

Critical observations open a persistent banner and focus-managed dialog. Audio starts only after an explicit user gesture, can be muted from the page or dialog, and releases oscillator/timer/context resources on acknowledgement/navigation. Hidden-page audio is silenced. Visual alerts remain active without audio support. No flashing effect is required to convey critical status.

“Mark seen in this browser” timestamps one observation without clearing other pending incidents. The latest 50 observations stay in memory only. This is not backend acknowledgement, medical dispatch, persisted history, or confirmation that a specific match paused. Match-less directives retain that distinction.

“Simulate Critical Field Emergency” is an explicitly local visual/audio test. It makes no webhook request and never bypasses the unsafe-socket gate. Organizer identities cannot submit athlete telemetry through the relay. End-to-end webhook/socket demonstrations require isolated staging, an authorized athlete source, safe targeted broadcasts and live services; the button does not claim that coverage.

## Remaining backend requirements

| Requested behavior                                                      | Current treatment / required contract                                       |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Organizer KPI totals and owned event directory                          | Unavailable cards, no invented zero counts; needs scoped listing/aggregates |
| Edit events or saved brackets; delete brackets                          | Dependency states; needs ownership-enforced mutation APIs                   |
| Custom sports, rules descriptions, per-place prizes, role quotas        | Excluded from writes; needs validated DTO/service support                   |
| Verified team/player rosters and pool totals                            | Dependency state; needs authorized organizer projections                    |
| Manual matchmaking trigger                                              | No action issued; needs authorized queue operation                          |
| Blocked sandbagging incident log                                        | Dependency state; needs audit persistence and reads                         |
| Fixtures, winner/score entry and verified GTI impact                    | Dependency state; needs fixture/result/verification APIs                    |
| All-player live vitals                                                  | Alert samples only; needs authorized telemetry stream and snapshot          |
| Confirm pause, medical dispatch, acknowledge/resume and durable history | Local seen timestamps only; needs persisted incident/match actions          |

See `verification.md` for checks and external acceptance limits. No claim of full functional completion or patent validation is made while these backend contracts remain absent.
