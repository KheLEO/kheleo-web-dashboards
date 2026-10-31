# Verification evidence

Verified locally on 31 October 2026 against backend source revision `0067d94` without changing backend files.

| Check                                          | Result                                         |
| ---------------------------------------------- | ---------------------------------------------- |
| Frozen pnpm install                            | Passed                                         |
| Schema snapshot and generated contracts        | Passed; compares sibling schema when available |
| ESLint with zero warnings                      | Passed                                         |
| Prettier check                                 | Passed                                         |
| Strict TypeScript and Next.js route generation | Passed                                         |
| Unit/integration tests                         | 85 passed across 17 files                      |
| Chromium browser journeys                      | 38 passed                                      |
| Production build                               | Passed on Node.js 22.23.4                      |
| Production dependency audit                    | No known vulnerabilities reported              |
| Backend worktree                               | Unchanged                                      |

Browser journeys exercise actual frontend HTTP handlers against an isolated contract fixture server. They cover Gov-ID login errors, forbidden direct navigation, passport initialization, logout/cache clearing, anti-sandbagging suggestions, Socket.IO roster delivery and teardown, organizer creation, scout projections, regional tables, simulator isolation, theme switching, accessibility, and 360px overflow.

The pose test loads the real self-hosted MediaPipe engine and model in Chromium with a fake camera, repeats start/stop three times, and checks ended camera tracks and terminated workers. This verifies the inference pipeline and lifecycle, not scoring accuracy against real athletic movement.

Unit/integration coverage includes refresh concurrency, original session expiry, logout during refresh, metadata/token preservation, mutation byte/UUID reuse, role/route restrictions, response shapes, HMAC compatibility, signing gates, biometric thresholds, short Bluetooth packets, dispatch priority/retry, geometry, invalid centroids, and nested form serialization.

Desktop athlete and mobile landing screenshots were inspected. Destructive controls use a semantic white-on-crimson foreground because the original silver-on-crimson combination measured 4.08:1, below the 4.5:1 AA threshold for small text. Gold, crimson, silver, and dark-surface brand values remain intact.

Production HTTP smoke checks passed: `/` and `/login` return 200; anonymous `/athlete` and `/admin` return streamed 200 responses containing Next.js login redirects; `/api/session/me` returns 401 with `private, no-store`; the unsupported leaderboard-list relay path returns 404. Streamed page redirects are Next.js behavior and are distinct from API authorization status codes.

## Remaining external acceptance

- No local Docker/Redis server executable or listening PostgreSQL, Redis, or NestJS service was available. Live NestJS/PostGIS/Redis/BullMQ journeys were not run.
- No physical Bluetooth wearable was available. Hardware behavior is implemented and packet parsing is tested; GATT behavior needs a supported device/browser validation session.
- Approved sport-specific scoring rules and the backend capabilities listed in `backend-dependencies.md` remain release prerequisites.
- CI configuration is included for Node.js 22; a hosted CI run has not been performed.

The admin/resilience update is authorized for commit and push to `origin/main`. No deployment or backend source changes are included.

Organizer coverage includes wizard date validation, venue map/coordinate synchronization, GTI range validation, exact creation DTOs, bracket draft removal, stable retries, ownership rejection, unavailable KPI states, local emergency acknowledgement, audio teardown, production telemetry/socket isolation, and mobile dialog contrast/accessibility. The Phase 2 baseline passed before organizer work; detailed scope is recorded in `organizer-portal.md`.

Scout/policy coverage includes lazy passport drawers, actual underrepresentation labels, alert timestamps and acknowledgement projection preservation, missing API gates, individual rank lookup, CSV/JSON downloads, table/map equivalence, invalid centroids, adjustable equity thresholds, CSV formula neutralization, bounded exports, failure/empty separation, policy role access, logout/cache isolation, keyboard operation and mobile accessibility. The Phase 3 baseline passed before scout work; details are in `scout-policy-portal.md`.

Admin/resilience coverage includes protected dashboard/governance/audit/theme routes, existing-contract user inspection, unavailable moderation/ledger states, browser-only connectivity, four accessible preset previews, safe color persistence/reset/CSS copying and rejected-storage fallback, 300 ms filter settlement and cleanup, synchronous duplicate-submit locking and stable retry operations, same-key query deduplication, bounded caches, 429 retry suppression, memory-adapter fixed-window rate rejection and error recovery wiring. The Phase 4 baseline passed before implementation; limits are recorded in `admin-resilience.md`.
