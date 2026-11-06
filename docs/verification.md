# Final full-stack acceptance — 6 November 2026

**READY FOR PRODUCTION DEPLOYMENT** for the verified release artifacts. All requested local gates pass. The fresh [backend native verification](https://github.com/KheLEO/kheleo-core-backend/actions/runs/42140215984) covers Node 22 and 24, PostgreSQL 16/PostGIS, Redis 7, real production HTTP/Socket.IO/BullMQ and non-root containers. Owner deployment acceptance remains required; this is not a claim that a live customer environment, physical sensors or clinical outcomes were certified.

## Measured gates

| Frontend command                               | Result                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm contracts:sync` / `pnpm contracts:check` | Pass; adjacent Prisma snapshot and generated strict types agree             |
| `pnpm lint`                                    | Pass, zero warnings                                                         |
| `pnpm format:check`                            | Pass                                                                        |
| `pnpm typecheck`                               | Pass, installed Next.js route types and strict TypeScript                   |
| `pnpm test`                                    | **213 tests, 30 files, all pass**                                           |
| `pnpm build`                                   | Pass, Next.js production build and MediaPipe/model asset preparation        |
| `pnpm test:e2e`                                | **61 Chromium tests, all pass**, including 360px/1920px portal route matrix |

| Backend command                                      | Result                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm prisma:generate` / `pnpm exec prisma validate` | Pass                                                                                                                                                         |
| `pnpm exec tsc --noEmit` / `pnpm build`              | Pass                                                                                                                                                         |
| `pnpm test`                                          | **196 tests, all pass**, including real migrated embedded PostGIS                                                                                            |
| `pnpm audit:probes`                                  | **5 pass, 0 fail**; no reproduced vulnerabilities in the active probe set                                                                                    |
| `node scripts/verify-entrypoints.cjs`                | Both `dist/main.js` and `dist/src/main.js` resolve and initialize modules; unavailable local infrastructure is explicitly distinguished from boot acceptance |
| Hosted native migration/start/smoke/image gates      | Pass on Node 22/24; real PostgreSQL/PostGIS and Redis, production start, HTTP, Socket.IO, queue GTI and non-root container health                            |

Local runtime: Node 24.19.0, frontend pnpm 11.24.0, backend pnpm 10.32.0. The embedded PostGIS WASM full suite runs on Node 24 in CI; Node 22 independently compiles and runs native service/exploit/production/container gates. Local Docker/PostgreSQL/Redis were unavailable, so fresh hosted results supply the native-service evidence.

## Scope and reproducibility

The entire frontend/backend `src` inventory was scanned, including all four portal route trees and their handlers. [Source manifest](contracts/source-audit.json) records content hashes. No `DependencyState` usages, quoted `Unavailable` metric placeholders, TODO/FIXME, `SCORING_NOT_APPROVED` or `HARDWARE_CONTRACT_PENDING` markers remain in either source tree. Missing measurements display an explicit awaiting-reading state; error paths expose retry controls instead of invented values.

[Controller inventory](contracts/backend-routes.json) contains **65 HTTP operations across 53 paths**, generated from compiled controllers. `tests/contracts/route-coverage.test.ts` checks every one of the **54 relay rules** against actual backend methods/paths, plus register/login/refresh/logout session operations. Prisma generation alone does not prove HTTP alignment; operation schemas, integration tests and native smoke complement it.

Prompt 5 closes the production login gap with real Supabase OTP acquisition and an accessible verification dialog. Provider contact calls exclude government ID, provider failures surface, cancellation never supplies an unverified proof, and pending organizer/scout registration shows an approval notice. Backend production contact verification remains fail-closed. Tests use the actual provider SDK against controlled HTTP responses; actual SMTP/SMS delivery is an owner acceptance step.

The active exploit harness now awaits the asynchronous signed-drill guard. The native smoke harness follows current confidential staff rooms and explicit medical acknowledgement/resume contracts, decodes raw cursor pages correctly, and uses a tournament-join acknowledgement barrier. Recovered safety outbox events retain incident IDs, source tags and physiological baseline tags through an additive migration.

## Security and capability acceptance

| Area                  | Verified behavior                                                                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessions and identity | Provider contact proof, permanent identity binding, pending staff approval, user-scoped idempotency, refresh-family logout/revocation, inactive/revoked/duplicate rejection                                     |
| WebSockets            | JWT handshakes on both namespaces, own athlete rooms and authorized tournament/bracket/match membership, private staff medical rooms, anonymous rejection, no global medical broadcast                          |
| Athlete               | Live 35/25/40 GTI components, calibrated four-preset practice scoring with pose digest/full HMAC, signed multi-sensor BLE and labeled simulator packets, stable nearby cursors, passport evidence authorization |
| Organizer             | Ownership on event/bracket operations, real queues/rosters/wall/summary, protected result scoring and medical pause lifecycle                                                                                   |
| Scout                 | Scoped National/State/District leaderboards, opt-in full dossier/shortlist/outreach/history and state-qualified regional heatmaps                                                                               |
| Administration        | Super Admin user governance, federation-limited moderation, audit pagination/filtering, immutable security records, operational health                                                                          |
| Recovery              | Transactional SQL outbox triggers, rollback and competing leases, retry/restart recovery, stable job identifiers and recovered alert provenance                                                                 |

Frontend browser E2E starts the real Next.js app with an isolated contract fixture. It validates all portals, mutations and camera/model lifecycle, not the native backend. Backend CI separately exercises real native services, measured GTI **98.6**, owner safety delivery with zero athlete/scout medical leakage, organizer/scout/admin reads and durable outbox drain. The active five probes use synthetic dependencies plus loopback Socket.IO. Files named `*.original.*` preserve historical failing exploit baselines and are not current acceptance gates.

Follow [the deployment runbook](production-deployment.md) for secrets, migrations, contact-provider configuration, first administrator, TLS, assets and the owner acceptance checklist. Load/capacity targets, physical camera/BLE authenticity, sports-science calibration and clinical escalation need deployment-specific validation. Software reference windows and signed browser claims are not hardware attestation.
