# Verification evidence

## Prompt 2 verification — 6 November 2026

Prompt 1 entrypoint aliases, relay PUT handling, all three numeric GTI components, authenticated socket handshakes, and room membership checks were verified before organizer implementation. The audit found broad staff-role medical broadcasts; these now use private authorized safety scopes, excluding participant rooms and unrelated organizers.

| Check                                                                       | Result                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------- |
| `pnpm contracts:sync` / `pnpm contracts:check`                              | Passed against the updated adjacent backend schema |
| Frontend `pnpm lint`, `pnpm typecheck`, `pnpm build`                        | Passed                                             |
| Frontend `pnpm test`                                                        | 26 files, 140 tests passed                         |
| `pnpm test:e2e`                                                             | 54 Chromium tests passed                           |
| Backend `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm exec prisma validate` | Passed                                             |
| Backend `pnpm test`                                                         | 182 tests passed                                   |

New checks cover scoped KPIs and owned cursors, roster/pool access, custom quota team formation using the actual matcher, durable rejection logs after rollback, named match results and retry deduplication, medical endpoint authorization, latest snapshots and incident coalescing, and real Socket.IO privacy. Embedded PostgreSQL applies the new migration and stores snapshots and medical-check fields. Browser tests verify populated event/bracket editing, deletion, queue-to-roster refresh, result-driven passport changes, and full-screen incident acknowledgement/resume across reloads.

Deploy migration `20261106010000_organizer_operations` before enabling the updated backend. Browser E2E uses deterministic backend fixtures; it does not exercise hosted PostgreSQL, Redis/BullMQ workers, physical wearables, clinical care, or production deployment. Medical dispatch and clearance are explicit staff confirmations stored with audit provenance.

## Prompt 1 verification — 6 November 2026

Both repositories were accessible on `main`. The existing contract check passed; the preflight type check exposed an existing nearby-pagination optional-property error, which this change fixes. Existing partial Prompt 1 edits were retained and completed.

| Check                                                                       | Result                                                                                    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm contracts:sync` / `pnpm contracts:check`                              | Passed against the adjacent backend and generated schema snapshot                         |
| `pnpm lint`, `pnpm typecheck`, `pnpm format:check`                          | Passed                                                                                    |
| Frontend `pnpm test`                                                        | 25 files, 132 tests passed                                                                |
| Frontend `pnpm build`                                                       | Passed                                                                                    |
| `pnpm test:e2e`                                                             | 48 Chromium tests passed, including mobile/accessibility journeys                         |
| Backend `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm exec prisma validate` | Passed                                                                                    |
| Backend `pnpm test`                                                         | 172 tests passed, including real Socket.IO transports and migrated PGlite/PostGIS queries |

New coverage checks unauthorized socket handshakes and room membership, self-authored evidence rejection, pending staff verification, logout/token-family revocation, canonical drill signatures, pose digest replay rejection, valid visibility/cadence, legacy nearby-array decoding, 45-tournament cursor traversal, GATT packet parsing and cleanup, labeled physiological baselines, simulator ingestion, and automatic passport refresh after `GTI_UPDATED`. The browser drill test sends synthetic landmark frames through the real frontend signing relay; the fixture verifies its HMAC and returns the backend's actual bare drill-result shape.

Before backend deployment, apply `20261106000000_telemetry_provenance` with `pnpm prisma:deploy`. Configure matching private drill and telemetry HMAC secrets in both services. The old staging/scoring/privacy flags no longer gate these capabilities.

These checks validate software contracts and authorization with deterministic fixtures and embedded PostgreSQL. They do not certify physical BLE devices, camera provenance, clinical safety, sports-science calibration, hosted Redis/BullMQ throughput, or a production deployment. Scoring policy 1.0.0 defines engineering reference windows; browser-reported landmarks and BLE provenance are not device attestation.

## Historical verification before Prompt 1

Verified locally on **31 October 2026**, against unchanged backend source revision `0067d9445048370c700f7b4bad8fa006cea43651`. Runtime: Node.js **24.19.0**, pnpm **11.24.0**, Next.js **16.4.3**. Node 22 remains the CI configuration; hosted CI has not been executed in this session.

| Check                                     | Result                                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen pnpm installation                  | Passed after removing five unused runtime dependencies                                                                                        |
| Schema snapshot and generated contracts   | Passed, including adjacent backend schema comparison                                                                                          |
| ESLint                                    | Passed with zero warnings                                                                                                                     |
| Prettier                                  | Passed                                                                                                                                        |
| Next.js route types and strict TypeScript | Passed, including `pnpm exec tsc --noEmit`                                                                                                    |
| Unit/integration tests                    | **105 passed across 19 files**                                                                                                                |
| Chromium browser journeys                 | **42 passed**, no retries; complete suite finished in 1.4 minutes                                                                             |
| Requested route matrix                    | **24/24 routes at 360px and 1920px**, expected headings/data, navigation reachability, no observed page/hydration errors or document overflow |
| Android browser emulation                 | Touch-enabled Galaxy S9+ profile, 360px viewport, 4× CPU throttling; navigation and critical simulator flow passed                            |
| Production build                          | Passed; all app routes compiled/generated                                                                                                     |
| Production dependency audit               | `pnpm audit --prod`: no known vulnerabilities reported                                                                                        |
| Backend source worktree                   | Unchanged                                                                                                                                     |

Production HTTP smoke checks passed for all 24 requested paths. All 20 protected portal paths required login; the identity alias rendered its redirect, public pages returned 200, anonymous `/api/session/me` returned 401 with `Cache-Control: private, no-store`, and the unsupported leaderboard relay path returned 404. Socket CSP origins matched the configured HTTP/WebSocket origins. These were anonymous production checks; authenticated production service flows require Redis and the live backend.

Mobile landing, critical wearable simulation, and theme-studio screenshots were visually inspected for text wrapping, control placement, and readable content. Landing feature copy was corrected to describe actual local joint-angle feedback and filtered prospect discovery.

The command equivalents follow repository package-manager rules: `pnpm exec tsc --noEmit` and `pnpm build`, with separate `pnpm lint` and `pnpm typecheck` gates. Browser tests start an isolated fixture backend on port 4100 and the real frontend on 3001. Fixtures establish frontend behavior against known contracts, not live NestJS/PostGIS/Redis/BullMQ operation.

## Coverage and fixes

Browser journeys cover public/auth entry points, permanent-profile onboarding states, bad credentials, forbidden direct navigation, role shells, policy-role access, passport editing and QR targets, GTI weighting, anti-sandbagging bracket upgrades, capacity conflicts, personal-room Socket.IO roster delivery/teardown, organizer event/bracket creation and ownership, lazy scout passport inspection, real alert acknowledgement, regional map/table/export behavior, missing capability gates, theme persistence/CSS export, keyboard/accessibility checks, mobile dialogs, simulator isolation, and recovery navigation.

The pose journey loads actual self-hosted MediaPipe WASM/model assets with Chromium's fake camera. It repeats start/stop three times and verifies ended tracks and terminated workers. This validates inference initialization and lifecycle, not technique scoring accuracy. Unit regressions additionally reject late camera callbacks after Stop/restart/unmount and prevent stale wearable connections from replacing a newer source.

Server tests cover eight-way refresh coordination including a simulated seven-second upstream refresh, metadata/token preservation, original expiry, logout during refresh, same-byte/UUID retries, self-deactivation session deletion, role/route/ownership enforcement, verified-evidence write rejection, environment validation, HMAC compatibility and signing gates, rate-limit rejection, and response shape validation. Local memory-adapter tests do not establish distributed Redis throughput.

Telemetry tests cover exact critical thresholds, little-endian HR formats, malformed packets, simulator timer cleanup, bounded dispatch, critical-sample priority over normal retries, identical retry operation/payloads, and ignored callbacks after Stop. A personal-room regression ensures the frontend does not join the backend's unrestricted bracket rooms; the E2E fixture emits only into the authenticated personal room.

See [frontend-audit.md](frontend-audit.md) for the route matrix, disclosure/contract findings, file inventory, and residual release gates. See [backend-contracts.md](backend-contracts.md) for wire formats and disclosure page/section mapping.

## Limits and external acceptance

- Production service integration with NestJS, PostgreSQL/PostGIS, Redis, BullMQ, and a real identity authority was not available for this run.
- No physical Android handset or Bluetooth wearable was tested. Chromium touch/CPU emulation does not establish real-device thermal, memory, battery, radio, or GATT behavior.
- Production scoring requires approved reference models/calibration. The relay keeps score ingestion disabled outside explicitly isolated staging practice.
- Event sockets remain gated because the backend globally broadcasts sensitive safety data and lacks sufficient room authorization. Durable history and authorized pause/resume/acknowledgement remain absent.
- Complete leaderboard lists, historical/outreach dossiers, organizer management projections, admin moderation/audit APIs, full wearable context, backend evidence-write protection, and token revocation remain dependencies.
- No production concurrency capacity, clinical safety, universal crash freedom, full patent implementation, or legal patent status is certified.
- This release is a frontend commit/push only; it does not deploy the application or change backend code.
