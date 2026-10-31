# Frontend audit — 31 October 2026

## Outcome and scope

All 24 requested routes exist, have entry points, and are covered by authenticated role-aware browser checks at 360px and 1920px. Route presence and rendering coverage are complete for the requested matrix. Complete invention functionality is **not** established: several required backend capabilities do not exist, production scoring is unapproved, and the safety gateway broadcasts sensitive data globally.

This audit covers repository-owned routes, components, features, contracts, server modules, tests, scripts, configuration, dependencies, and documentation. The file inventory below records each tracked file and any removals. Generated build output, downloaded models, installed dependencies, Git internals, and ignored test artifacts are excluded from source review. Generated contracts are checked against the committed and adjacent backend schemas. Dependency packages are validated through the frozen lockfile, build/type checks, and production dependency audit; their entire upstream implementations were not manually audited.

Backend source reviewed: `../KheLEO-backend`, revision `0067d9445048370c700f7b4bad8fa006cea43651`. The backend worktree is unchanged. The six-page local `Kheleo_Invention_Disclosure_Form.pdf` was reviewed; section/page mappings are recorded in [backend-contracts.md](backend-contracts.md).

## Route matrix

The public landing supplies role portal cards. Persona shells link canonical dashboard routes and keep older route aliases active. Mobile drawers and desktop menus scroll; bottom navigation reserves device safe-area space. Server layouts enforce roles on direct navigation.

| Route                           | Rendering / interaction                                    | External dependency                                          |
| ------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `/`                             | Landing and four portal entry cards                        | None for anonymous rendering                                 |
| `/login`                        | Contact and government-ID proof form                       | Backend authentication                                       |
| `/signup`                       | Athlete registration and identity reattachment errors      | Backend identity binding                                     |
| `/verify-identity`              | Authenticated athlete identity workflow                    | Actual `auth/verify-government-id` endpoint                  |
| `/athlete/dashboard`            | Passport, GTI breakdown, role and profile actions          | Authoritative profile data                                   |
| `/athlete/passport`             | Editable sports identity and protected QR target           | No separate stance metadata contract                         |
| `/athlete/tournaments`          | Radius/sport/location search, cards, client map            | Bounded to 20; backend cursor ordering defect                |
| `/athlete/matchmaking`          | Context selection and sport roles                          | Team assembly runs in backend queues                         |
| `/athlete/drills`               | Local worker/camera practice studio                        | Production calibration/approved scoring missing              |
| `/athlete/iot-device`           | Bluetooth HR, local simulator, bounded chart               | Full hardware/context ingestion missing                      |
| `/organizer/dashboard`          | Workspace entry points and dependency labels               | Statistics projection missing                                |
| `/organizer/tournaments`        | Known-ID event lookup and creation entry                   | Owned directory/edit contracts missing                       |
| `/organizer/tournaments/create` | Multi-step venue/event/bracket wizard                      | Supported creation DTOs only                                 |
| `/organizer/brackets`           | Known event context and bracket workflow                   | Roster/match operation APIs missing                          |
| `/organizer/safety`             | Event selection, critical dialog, audio/local test         | Confidential/durable live incidents and pause/resume missing |
| `/scout/dashboard`              | Prospect and policy overview                               | Authoritative scout data                                     |
| `/scout/leaderboards`           | Individual rank lookup; listing controls gated             | National/state/district list API missing                     |
| `/scout/feed`                   | Elite filtering, alert acknowledgement, passport inspector | Season/outreach/dossier histories missing                    |
| `/scout/heatmaps`               | Client Leaflet centroid layers, table, exports             | Aggregate completeness/state identity missing                |
| `/admin/dashboard`              | Protected console and frontend session connectivity        | Platform health/KPI APIs missing                             |
| `/admin/users`                  | Authorized known-user lookup                               | Review queues/credential decision APIs missing               |
| `/admin/tournaments`            | Moderation contract dependency details                     | Listing/moderation/audit contracts missing                   |
| `/admin/audit-logs`             | Selectable audit categories and exact missing projections  | Persisted audit listing APIs missing                         |
| `/admin/theme`                  | Presets, validated colors, contrast preview, CSS clipboard | Browser-local preferences; no shared theme API               |

A rendered dependency state is not evidence that the corresponding product capability is complete. Missing listing/moderation APIs cannot be implemented by inventing frontend responses or bypassing backend authorization.

## Contract findings and corrections

1. **Permanent identity:** the backend route is `POST auth/verify-government-id`, not `verify-gov-id`. Reattachment occurs in backend registration when identity/contact proof matches; frontend forms preserve errors and do not create replacement identities.
2. **Sport evidence forgery:** the backend self-service DTO accepts `verifiedMetrics` and `earnedBadges`. The relay now rejects both, and the passport no longer stores editable stance in verified evidence. Role-only updates preserve existing backend metrics. Direct backend clients still require remediation.
3. **Sandbagging:** only HTTP 409 with `SANDBAGGING_DETECTED` opens the upgrade flow. Actual bracket suggestions and eligibility are loaded; below-tier and capacity conflicts remain distinct. The live component and tests now use the canonical API error class.
4. **Roster privacy:** the backend checks personal user-room identity but does not authorize bracket-room membership. The frontend now joins only its own authenticated user room. The fixture delivers rosters through that room, and a regression asserts no bracket-room join. The direct backend subscription defect remains documented.
5. **Webcam lifecycle:** generation checks reject late permission/error callbacks after Stop, a replacement request, or unmount, immediately stopping stale tracks instead of initializing another worker.
6. **Wearable lifecycle:** Stop clears pending connection state; stale source results/readings cannot replace a new source. Browser-only Bluetooth, pose worker, capability, and audio APIs are explicitly guarded.
7. **Telemetry priority:** a failed normal retry retains its original UUID/body without overwriting pending critical data. Critical samples precede normal retries; stopped dispatchers and unmounted ingestion panels ignore late callbacks.
8. **Refresh concurrency:** the old six-second lock wait was shorter than the twelve-second upstream timeout. The bounded wait is now fifteen seconds; eight concurrent requests complete one simulated seven-second refresh without unnecessary failures or expiry extension.
9. **Self-deactivation:** successful account deactivation deletes the current web session in the same relay request. Backend token revocation and other sessions still require backend support.
10. **Discovery:** removed UUID-based distance pagination because it can omit results. Search now explicitly shows at most 20 results. Bracket/sport cursor loops reject repeated cursors within the bounded cache.
11. **Configuration:** `NEXT_PUBLIC_API_URL` is a validated fallback for the server API target. `NEXT_PUBLIC_WS_URL` and the canonical socket origin share normalization/validation in the client and CSP, including WS(S) to HTTP(S) conversion. Supabase is explicitly optional and unused by current routes.
12. **Dead code:** removed unreferenced wrappers, the unused socket context, duplicate Axios client, obsolete hooks/components/styles, and unused runtime packages. The optional Supabase factory and generated scalar references are retained deliberately and documented.
13. **Error recovery:** app/global boundaries safely narrow arbitrary thrown values before reading a digest, preserving recovery even for `null` or non-Error throws.

HMAC signing remains server-only through Web Crypto. `NEXT_PUBLIC_DRILL_HMAC_SECRET` is unsupported because every browser user could extract it and forge submissions. The actual signing payload and exact telemetry bytes remain backend-compatible. No raw camera video, frames, or full landmark arrays are sent to the backend.

## Mobile, SSR, and resource limits

- All requested routes are checked at 360×800 and 1920×1080 for expected headings, loaded data, page errors, hydration errors, and document overflow. Navigation links are individually checked for visibility/reachability.
- A separate Chromium Android device profile uses touch input, a 360px viewport, and four-times CPU throttling to exercise navigation and the critical wearable simulator. This is browser emulation, not physical low-end Android hardware acceptance or a measured production performance guarantee.
- Leaflet renders only through client loaders with `ssr: false`. Camera/Web Bluetooth/AudioContext/worker use is behind browser lifecycle, explicit capability guards, and user gestures.
- MediaPipe permits one frame in flight, at most 15 submitted frames/second, and at most five React feedback updates/second. Camera/worker/visibility cleanup is tested with real locally served inference assets and a fake camera.
- Vitals retain 60 readings; safety incidents retain 50; paginated records retain at most five 20-row pages; regional rendering/export caps at 500 rows. Query caches expire, filters debounce, and submissions use synchronous duplicate-action locks.
- Server sessions use shared Redis coordination in production, opaque HttpOnly cookies, refresh locking, origin enforcement, operation fingerprints, and rate limits. Tests use the memory adapter; they do not measure distributed Redis throughput or thousands of simultaneous real users.

## Remaining acceptance gates

- Actual backend service journeys with NestJS, PostgreSQL/PostGIS, Redis, BullMQ, and identity authority integration.
- Physical Android/browser and wearable GATT/permission/disconnection validation, including full SpO₂/temperature service contracts.
- Approved/versioned pose reference models and scoring calibration; production score ingestion stays disabled.
- Confidential event connection/room authorization, removal of global safety broadcasts, durable incident history, and authorized pause/resume/acknowledgement APIs.
- Organizer directories/editing/rosters/results/statistics; complete leaderboard lists; historical dossiers/outreach; admin moderation and persisted audit APIs.
- Backend prevention of athlete-authored verified evidence and deactivation/token-family revocation across direct clients and other sessions.
- Real staging load tests and hosted CI execution. No claim of universal crash elimination, clinical validation, patent validation, or full production readiness is made.

Measured command/browser outcomes are recorded in [verification.md](verification.md).

## File-by-file review inventory

The following inventory records repository coverage, responsibility, and final change state. Verification columns describe the relevant review/check family; they do not imply that every possible runtime state of a file was exercised. Removed files are listed separately. `pnpm-lock.yaml` is reviewed through the scoped dependency removal, frozen installation, and registry audit.

| File                                                                                      | State    | Review/check family                                                                               |
| ----------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `.env.example`                                                                            | Updated  | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `.github/workflows/ci.yml`                                                                | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `.gitignore`                                                                              | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `.node-version`                                                                           | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `.nvmrc`                                                                                  | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `.prettierignore`                                                                         | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `.prettierrc.json`                                                                        | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `AGENTS.md`                                                                               | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `README.md`                                                                               | Updated  | Documentation/source consistency and explicit capability limits                                   |
| `components.json`                                                                         | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `docs/admin-resilience.md`                                                                | Retained | Documentation/source consistency and explicit capability limits                                   |
| `docs/architecture.md`                                                                    | Retained | Documentation/source consistency and explicit capability limits                                   |
| `docs/athlete-portal.md`                                                                  | Updated  | Documentation/source consistency and explicit capability limits                                   |
| `docs/backend-contracts.md`                                                               | Updated  | Documentation/source consistency and explicit capability limits                                   |
| `docs/backend-dependencies.md`                                                            | Updated  | Documentation/source consistency and explicit capability limits                                   |
| `docs/contracts/schema.prisma`                                                            | Retained | Schema snapshot/checksum and generated contract consistency                                       |
| `docs/contracts/source.json`                                                              | Retained | Schema snapshot/checksum and generated contract consistency                                       |
| `docs/frontend-audit.md`                                                                  | Added    | Documentation/source consistency and explicit capability limits                                   |
| `docs/organizer-portal.md`                                                                | Retained | Documentation/source consistency and explicit capability limits                                   |
| `docs/scout-policy-portal.md`                                                             | Retained | Documentation/source consistency and explicit capability limits                                   |
| `docs/verification.md`                                                                    | Updated  | Documentation/source consistency and explicit capability limits                                   |
| `eslint.config.mjs`                                                                       | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `next.config.ts`                                                                          | Updated  | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `package.json`                                                                            | Updated  | Dependency usage, frozen install, runtime/scripts and production registry audit                   |
| `playwright.config.ts`                                                                    | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `pnpm-lock.yaml`                                                                          | Updated  | Dependency usage, frozen install, runtime/scripts and production registry audit                   |
| `pnpm-workspace.yaml`                                                                     | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `postcss.config.mjs`                                                                      | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `scripts/sync-assets.ts`                                                                  | Retained | Asset checksum/version or schema-generation review; script execution                              |
| `scripts/sync-contracts.ts`                                                               | Retained | Asset checksum/version or schema-generation review; script execution                              |
| `src/app/(admin)/admin/audit-logs/page.tsx`                                               | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/dashboard/page.tsx`                                                | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/identity-audit/page.tsx`                                           | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/layout.tsx`                                                        | Updated  | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/organizers/page.tsx`                                               | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/page.tsx`                                                          | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/security-audit/page.tsx`                                           | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/system/page.tsx`                                                   | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/theme/page.tsx`                                                    | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/tournaments/page.tsx`                                              | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(admin)/admin/users/page.tsx`                                                    | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/dashboard/page.tsx`                                            | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/drills/[drillType]/page.tsx`                                   | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/drills/page.tsx`                                               | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/identity/page.tsx`                                             | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/iot-device/page.tsx`                                           | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/layout.tsx`                                                    | Updated  | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/matchmaking/page.tsx`                                          | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/page.tsx`                                                      | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/passport/edit/page.tsx`                                        | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/passport/page.tsx`                                             | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/passport/sports/page.tsx`                                      | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/settings/page.tsx`                                             | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/tournaments/[tournamentId]/brackets/[bracketId]/page.tsx`      | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/tournaments/[tournamentId]/brackets/[bracketId]/pool/page.tsx` | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/tournaments/[tournamentId]/page.tsx`                           | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/tournaments/page.tsx`                                          | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(athlete)/athlete/wearable/page.tsx`                                             | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(auth)/layout.tsx`                                                               | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(auth)/login/page.tsx`                                                           | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(auth)/register/page.tsx`                                                        | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(auth)/signup/page.tsx`                                                          | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(auth)/verify-identity/page.tsx`                                                 | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/brackets/page.tsx`                                         | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/dashboard/page.tsx`                                        | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/layout.tsx`                                                | Updated  | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/page.tsx`                                                  | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/safety/page.tsx`                                           | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/[tournamentId]/brackets/new/page.tsx`          | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/[tournamentId]/brackets/page.tsx`              | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/[tournamentId]/edit/page.tsx`                  | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/[tournamentId]/page.tsx`                       | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/[tournamentId]/rosters/page.tsx`               | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/[tournamentId]/safety/page.tsx`                | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/create/page.tsx`                               | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/new/page.tsx`                                  | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(organizer)/organizer/tournaments/page.tsx`                                      | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/alerts/page.tsx`                                                   | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/athletes/[userId]/page.tsx`                                        | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/dashboard/page.tsx`                                                | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/feed/page.tsx`                                                     | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/heatmaps/page.tsx`                                                 | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/layout.tsx`                                                        | Updated  | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/leaderboards/page.tsx`                                             | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/page.tsx`                                                          | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/prospects/page.tsx`                                                | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/(scout)/scout/regional/page.tsx`                                                 | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/api/backend/[...path]/route.ts`                                                  | Retained | Session/relay wiring; contract and security tests                                                 |
| `src/app/api/session/login/route.ts`                                                      | Retained | Session/relay wiring; contract and security tests                                                 |
| `src/app/api/session/logout/route.ts`                                                     | Retained | Session/relay wiring; contract and security tests                                                 |
| `src/app/api/session/me/route.ts`                                                         | Retained | Session/relay wiring; contract and security tests                                                 |
| `src/app/api/session/refresh/route.ts`                                                    | Retained | Session/relay wiring; contract and security tests                                                 |
| `src/app/api/session/register/route.ts`                                                   | Retained | Session/relay wiring; contract and security tests                                                 |
| `src/app/api/session/socket-token/route.ts`                                               | Retained | Session/relay wiring; contract and security tests                                                 |
| `src/app/error.tsx`                                                                       | Updated  | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/forbidden/page.tsx`                                                              | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/global-error.tsx`                                                                | Updated  | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/globals.css`                                                                     | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/layout.tsx`                                                                      | Updated  | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/loading.tsx`                                                                     | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/not-found.tsx`                                                                   | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/page.tsx`                                                                        | Updated  | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/app/unsupported/page.tsx`                                                            | Retained | Route/layout/SSR review; production build; route matrix or focused journeys                       |
| `src/components/athlete/BracketRegistrationModal.tsx`                                     | Updated  | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/athlete/SportsPassportCard.tsx`                                           | Updated  | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/layout/AppShell.tsx`                                                      | Updated  | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/layout/MobileBottomNav.tsx`                                               | Updated  | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/scout/ScoutDossierModal.tsx`                                              | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shared/BrandLogo.tsx`                                                     | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shared/async-state.tsx`                                                   | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shared/connection-status.tsx`                                             | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shared/cursor-list.tsx`                                                   | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shared/dependency-state.tsx`                                              | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shared/metric-card.tsx`                                                   | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shared/page-heading.tsx`                                                  | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shared/recovery-view.tsx`                                                 | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shell/brand.tsx`                                                          | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shell/header.tsx`                                                         | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shell/mobile-navigation.tsx`                                              | Updated  | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shell/persona-navigation.ts`                                              | Updated  | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/shell/sidebar.tsx`                                                        | Updated  | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/alert-dialog.tsx`                                                      | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/alert.tsx`                                                             | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/badge.tsx`                                                             | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/button.tsx`                                                            | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/card.tsx`                                                              | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/dialog.tsx`                                                            | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/form.tsx`                                                              | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/skeleton.tsx`                                                          | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/components/ui/table.tsx`                                                             | Retained | Props, navigation, forms, semantics, responsive layout; typing/browser checks                     |
| `src/contracts/auth.ts`                                                                   | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/common.ts`                                                                 | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/drills.ts`                                                                 | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/enums.generated.ts`                                                        | Retained | Schema snapshot/checksum and generated contract consistency                                       |
| `src/contracts/gti.ts`                                                                    | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/matchmaking.ts`                                                            | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/passport.ts`                                                               | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/prisma-scalars.generated.ts`                                               | Retained | Schema snapshot/checksum and generated contract consistency                                       |
| `src/contracts/realtime.ts`                                                               | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/regional.ts`                                                               | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/safety.ts`                                                                 | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/scouting.ts`                                                               | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/tournaments.ts`                                                            | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/users.ts`                                                                  | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/contracts/validators.ts`                                                             | Retained | Backend DTO/envelope/enum review; schema and contract tests                                       |
| `src/features/admin/admin-workspace.tsx`                                                  | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/admin/api.ts`                                                               | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/admin/audit-console.tsx`                                                    | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/admin/capability-requirements.ts`                                           | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/admin/frontend-connectivity.tsx`                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/admin/governance-workspace.tsx`                                             | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/admin/theme-studio.tsx`                                                     | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/admin/user-inspector.tsx`                                                   | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/athlete/sport-options.ts`                                                   | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/auth/api.ts`                                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/auth/identity-form.tsx`                                                     | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/auth/login-form.tsx`                                                        | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/auth/registration-form.tsx`                                                 | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/auth/schemas.ts`                                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/auth/session-provider.tsx`                                                  | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/api.ts`                                                              | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/drill-camera.tsx`                                                    | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/drill-catalog.ts`                                                    | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/drill-summary.tsx`                                                   | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/joint-angles.ts`                                                     | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/landmark-overlay.tsx`                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/pose-engine.client.ts`                                               | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/pose.worker.ts`                                                      | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/practice-submission.tsx`                                             | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/preset-evaluation.ts`                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/scoring-policy.ts`                                                   | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/session-reducer.ts`                                                  | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/use-drill-session.ts`                                                | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/drills/worker-protocol.ts`                                                  | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/leaderboards/leaderboard-workspace.tsx`                                     | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/matchmaking/api.ts`                                                         | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/matchmaking/join-pool-form.tsx`                                             | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/matchmaking/matchmaking-hub.tsx`                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/matchmaking/pool-status.tsx`                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/matchmaking/queries.ts`                                                     | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/matchmaking/roster-card.tsx`                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/matchmaking/use-roster-events.ts`                                           | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/organizer/bracket-workspace.tsx`                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/organizer/event-draft.ts`                                                   | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/organizer/event-selector.tsx`                                               | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/organizer/gti-range.tsx`                                                    | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/organizer/venue-picker.client.tsx`                                          | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/passport/api.ts`                                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/passport/passport-card.tsx`                                                 | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/passport/passport-view.tsx`                                                 | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/passport/profile-form.tsx`                                                  | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/passport/queries.ts`                                                        | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/passport/schemas.ts`                                                        | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/passport/settings.tsx`                                                      | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/passport/sport-record-form.tsx`                                             | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/rankings/api.ts`                                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/rankings/individual-rank-card.tsx`                                          | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/rankings/queries.ts`                                                        | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/regional/api.ts`                                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/regional/centroid-parser.ts`                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/regional/policy-report.ts`                                                  | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/regional/queries.ts`                                                        | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/regional/regional-map.tsx`                                                  | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/regional/regional-table.tsx`                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/safety/alert-reducer.ts`                                                    | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/safety/api.ts`                                                              | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/safety/command-center.tsx`                                                  | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/safety/critical-alert-dialog.tsx`                                           | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/safety/use-safety-alarm.ts`                                                 | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/safety/use-safety-events.ts`                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/safety/vitals-chart.tsx`                                                    | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/scouting/alerts-list.tsx`                                                   | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/scouting/api.ts`                                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/scouting/athlete-passport-preview.tsx`                                      | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/scouting/prospect-card.tsx`                                                 | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/scouting/prospect-filters.tsx`                                              | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/scouting/queries.ts`                                                        | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/scouting/scout-feed.tsx`                                                    | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/scouting/scout-overview.tsx`                                                | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/api.ts`                                                         | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/bracket-form.tsx`                                               | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/discovery-filters.tsx`                                          | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/organizer-overview.tsx`                                         | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/queries.ts`                                                     | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/registration-dialog.tsx`                                        | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/schemas.ts`                                                     | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/tournament-card.tsx`                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/tournament-detail.tsx`                                          | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/tournaments/tournament-form.tsx`                                            | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/wearables/bluetooth-source.client.ts`                                       | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/wearables/heart-rate-parser.ts`                                             | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/wearables/simulator-controls.tsx`                                           | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/wearables/simulator-source.client.ts`                                       | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/wearables/telemetry-dispatcher.ts`                                          | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/wearables/types.ts`                                                         | Retained | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/wearables/use-wearable.ts`                                                  | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/features/wearables/wearable-panel.tsx`                                               | Updated  | Domain workflow, DTOs, resource/error lifecycle; unit/integration/browser checks                  |
| `src/hooks/use-browser-capabilities.ts`                                                   | Updated  | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/hooks/use-debounced-value.ts`                                                        | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/api/browser-client.ts`                                                           | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/api/errors.ts`                                                                   | Updated  | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/api/operation.ts`                                                                | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/api/response-decoders.ts`                                                        | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/capabilities.ts`                                                                 | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/format.ts`                                                                       | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/maps/leaflet-map.client.tsx`                                                     | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/maps/map-loader.tsx`                                                             | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/maps/tile-config.ts`                                                             | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/maps/tournament-map.tsx`                                                         | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/query/client.ts`                                                                 | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/query/keys.ts`                                                                   | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/realtime/event-deduplication.ts`                                                 | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/realtime/socket.client.ts`                                                       | Updated  | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/socket-origin.ts`                                                                | Added    | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/supabase.ts`                                                                     | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/theme/customization.ts`                                                          | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/lib/utils.ts`                                                                        | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/providers/QueryProvider.tsx`                                                         | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/providers/ThemeProvider.tsx`                                                         | Retained | Shared client/SSR/cache/theme lifecycle and import review; typing/tests/build                     |
| `src/server/api/drill-relay.ts`                                                           | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/api/nest-client.ts`                                                           | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/api/problem.ts`                                                               | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/api/relay.ts`                                                                 | Updated  | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/api/route-registry.ts`                                                        | Updated  | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/api/session-handler.ts`                                                       | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/api/telemetry-relay.ts`                                                       | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/auth/permissions.ts`                                                          | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/auth/require-session.ts`                                                      | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/auth/session-store.ts`                                                        | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/auth/session.ts`                                                              | Updated  | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/capabilities.ts`                                                              | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/env.ts`                                                                       | Updated  | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/observability/logger.ts`                                                      | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/security/hmac.ts`                                                             | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/security/operation-store.ts`                                                  | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/security/rate-limit.ts`                                                       | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/server/security/request-origin.ts`                                                   | Retained | Authorization, sessions, signing, data protection and concurrency review; integration checks      |
| `src/test/factories.ts`                                                                   | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `src/test/msw/handlers.ts`                                                                | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `src/test/msw/server.ts`                                                                  | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `src/test/setup.ts`                                                                       | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tailwind.config.ts`                                                                      | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `tests/contracts/athlete-presets.test.ts`                                                 | Updated  | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/contracts/biometrics.test.ts`                                                      | Updated  | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/contracts/competition.test.ts`                                                     | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/contracts/foundation.test.ts`                                                      | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/contracts/organizer.test.ts`                                                       | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/contracts/policy-report.test.ts`                                                   | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/contracts/pose-regional.test.ts`                                                   | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/contracts/socket-origin.test.ts`                                                   | Added    | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/contracts/theme-customization.test.ts`                                             | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/e2e/workspaces.spec.ts`                                                            | Updated  | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/fixtures/backend.ts`                                                               | Updated  | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/device-lifecycle.test.tsx`                                             | Added    | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/forms.test.tsx`                                                        | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/network.test.ts`                                                       | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/practice-signing.test.ts`                                              | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/rate-limit.test.ts`                                                    | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/relay.test.ts`                                                         | Updated  | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/resilience.test.tsx`                                                   | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/safety-events.test.tsx`                                                | Updated  | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/security.test.ts`                                                      | Updated  | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/integration/session.test.ts`                                                       | Updated  | Fixture/assertion scope review; deterministic suite execution                                     |
| `tests/server-only.ts`                                                                    | Retained | Fixture/assertion scope review; deterministic suite execution                                     |
| `tsconfig.json`                                                                           | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |
| `vitest.config.ts`                                                                        | Retained | Repository/runtime/tooling/security configuration review; applicable formatting/lint/build checks |

### Removed source files

- `src/components/shell/app-shell.tsx`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/components/ui/input.tsx`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/components/ui/label.tsx`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/components/ui/select.tsx`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/features/drills/schemas.ts`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/features/passport/athlete-overview.tsx`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/hooks/use-page-visibility.ts`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/hooks/use-reduced-motion.ts`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/lib/api-client.ts`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/lib/query/provider.tsx`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/lib/realtime/subscriptions.ts`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/lib/socket.ts`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/lib/theme/resolve-color.client.ts`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/providers/SocketProvider.tsx`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/server/auth/refresh-lock.ts`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.
- `src/styles/globals.css`: unused implementation, duplicate provider/client, or forwarding wrapper; canonical consumers retained.

Inventory: 306 retained/updated/new repository files and 16 removed files.
