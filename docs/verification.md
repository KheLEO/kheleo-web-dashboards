# Verification evidence

Verified locally on 31 October 2026 against backend source revision `0067d94` without changing backend files.

| Check                                          | Result                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| Frozen pnpm install                            | Passed                                                             |
| Schema snapshot and generated contracts        | Passed; compares sibling schema when available                     |
| ESLint with zero warnings                      | Passed                                                             |
| Prettier check                                 | Passed                                                             |
| Strict TypeScript and Next.js route generation | Passed                                                             |
| Unit/integration tests                         | 56 passed across nine files                                        |
| Chromium browser journeys                      | 13 passed                                                          |
| Production build                               | Passed on Node.js 22.23.4; also verified with host Node.js 24.19.0 |
| Production dependency audit                    | No known vulnerabilities reported                                  |
| Backend worktree                               | Unchanged                                                          |

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

No deployment, commit, or push is part of this local implementation.
