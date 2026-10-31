# Backend dependencies

These are activation prerequisites, not implemented or guessed endpoints. No change to the backend repository is included.

| Capability              | Required backend work                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Privileged onboarding   | Authorized provisioning of organizer, scout, federation, and admin accounts                          |
| Event directory         | Paginated organizer-owned list with enforced ownership                                               |
| Event editing           | Validated update DTO and authorized update action                                                    |
| Event configuration     | Custom sports, rules descriptions, per-place prize allocations and configurable role quotas          |
| Organizer statistics    | Scoped counts for events, verified registrations, formed teams, payouts and current alerts           |
| Match results           | Fixture reads, verified outcomes and authorized organizer/umpire entry                               |
| Matchmaking controls    | Authorized manual queue trigger and organizer queue projections                                      |
| Sandbagging audits      | Persisted blocked-attempt events and authorized log reads                                            |
| Continuous vitals       | Authorized all-player telemetry stream and latest snapshot                                           |
| Organizer rosters       | Registration/team/match projections and authorized operations                                        |
| Leaderboard lists       | National/state/district scopes and stable cursor DTOs                                                |
| Scout outreach          | Authorized trial offers, sponsorship inquiries, athlete notifications and saved shortlists           |
| Dossier history         | Season GTI series, signed drill evidence, recovery metrics and verified podium projections           |
| Alert enrichment        | Verification, rural status and previous-GTI/delta fields; scout-specific acknowledgement if required |
| Full dossiers           | Authorized flattened athlete/scout projection; private notes and shortlist contracts if required     |
| Admin tools             | Organizer review, event moderation, duplicate-ID audit, HMAC audit, system/queue health APIs         |
| Safe event sockets      | Connection authentication, authorized subscriptions, and removal of global sensitive broadcasts      |
| Durable safety state    | Alert history/current snapshot, stable event IDs, match acknowledgement/resume contracts             |
| Scout realtime          | Authorized scout room subscription                                                                   |
| Nearby pagination       | Cursor ordered consistently with distance and unique tie-breaker                                     |
| Scout feed pagination   | Unique stable tie-breaker for score ordering                                                         |
| Regional completeness   | Completeness/limit metadata, state-disambiguated districts, consistent spatial/fallback aggregation  |
| Drill scoring           | Approved and versioned scoring/calibration; stronger provenance if anti-cheat proof is required      |
| Full wearable ingestion | Documented SpO₂/temperature services and authorized athlete/match context                            |
| Backend logout          | Token revocation endpoint for immediate backend invalidation                                         |

`SAFE_EVENTS_VERIFIED=false` remains the default. Enabling it is an operator assertion that the listed socket defects have been fixed and tested; it is not itself a fix.

Simulator ingestion requires `APP_ENV=staging`, `SIMULATOR_INGESTION=true`, `STAGING_DATA_ISOLATED=true`, private Redis, and the correct server-side HMAC secret. Production simulation never ingests. The simulator rejects match, bracket, and tournament IDs because authorized match membership cannot currently be established.

Production drill scoring is hard-gated in the relay. Provisional practice ingestion requires `APP_ENV=staging`, `DRILL_PRACTICE_INGESTION=true`, `STAGING_DATA_ISOLATED=true`, private Redis, and the server-only drill HMAC secret. These estimates must never be represented as calibrated performance or sent to production. Additional hardware services are required before hardware ingestion can be enabled.
