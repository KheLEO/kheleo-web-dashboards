# Super-admin portal and resilience

Backend source remains `0067d94`. No backend source, deployment, privileged provisioning or new admin API is included. Admin routes require `SUPER_ADMIN` in their server layout; navigation is presentation only.

## Phase 4 audit

Before this change, contract checks, lint, strict typing, 77 unit/integration tests and 31 browser journeys passed. Scout dashboard, feed, leaderboards and heatmap routes compile. The authorized passport inspector, real alert acknowledgement and regional centroid/equity layers work through the existing relay.

Leaderboard lists, state/demographic rankings, full dossier histories and outreach remain backend dependencies. No `/gti/leaderboards` or `/users/:id/dossier` request is fabricated. This phase does not convert those dependency states into unsupported implementations.

## Admin capabilities

- `/admin/dashboard` is a protected route. Six platform KPI/health cards show unavailable states because authoritative metrics endpoints do not exist. No zero counts, latency measurements or health claims are invented.
- Frontend connectivity reports a browser network hint and a manually requested, sanitized `/session/me` result. It does not claim Redis, PostGIS, queue or backend health.
- `/admin/users` inspects a known UUID using the existing authenticated `GET /users/:id` contract. The backend and relay allow another user's details only for `SUPER_ADMIN`. This read projection has contact, role and activity fields, not organizer/scout approval or identity verification evidence.
- Credential verification/revocation, approval queues, sport/model administration and tournament/bracket feature/edit/suspend actions remain unavailable. Read-only enum/practice-reference summaries are not a mutable master catalog. Account activity/deactivation is not credential approval.
- `/admin/audit-logs` describes identity, drill HMAC/replay, sandbagging and safety streams. Date, identity and outcome record filters remain disabled until listing contracts exist. There are no fabricated immutable records or completeness claims. Existing identity/security audit and system dependency routes remain supported.
- Identity verification uses the actual `/auth/verify-government-id` contract. No identity hash or raw government-ID projection is added. Client local safety observations are not a persisted compliance/insurance registry.

## Theme studio

`/admin/theme` offers Golden Crimson, Royal Emerald, Midnight Cyber and Light Stadium presets. Color pickers update a fixed list of palette variables and their paired RGB channels so Tailwind opacity utilities, semantic colors and metallic gradients follow the preview. All preset color literals remain in `globals.css`.

Only validated six-digit hexadecimal overrides and the preset ID are stored as harmless browser preferences. Storage values cannot introduce arbitrary CSS property names or CSS expressions. Storage events synchronize tabs; unavailable browser storage produces a visible tab-only warning. Selecting another preset resets custom overrides.

The studio provides component previews, normal-text contrast spot checks and a real clipboard action that exports the computed palette as a `:root` block for merging with the existing semantic tokens in `globals.css`. Copying a palette does not publish a platform-wide change. Experimental colors can fail contrast; spot checks do not certify whole-application accessibility. Preset browser checks cover the studio at rest after finite color transitions complete.

## Request and resource protection

- API-driving discovery, prospect, alert, rank and admin-user lookup state settles for 300 ms before queries change. Stale timers are cancelled on replacement/unmount. Search forms already submit explicitly; typing does not call the backend. Pure local map/table/audit presentation controls do not generate network requests.
- Generic forms acquire a synchronous lock before asynchronous validation, then use React Hook Form submitting state. Stable UUID/body operation objects survive explicit retries. Bespoke registration, event/bracket creation and alert acknowledgement retain their existing locks; GTI recalculation, drill submission, pool departure, logout and wearable attachment also guard rapid repeated actions.
- Root and feature query clients now share the same defaults: two-minute inactive retention, bounded read retries/backoff, no automatic mutation retries, and no automatic retry of authorization, validation, conflict or throttling responses. Concurrent same-key reads share TanStack's in-flight query. Paginated lists retain at most five 20-row pages.
- Existing distributed refresh rotation and server-side fixed-window rate limits remain in force. Redis rate counters use an atomic Lua increment/expiry operation. Local tests demonstrate fixed-window rejection and identity separation with the memory adapter; they do not establish distributed Redis throughput or production capacity.
- Camera/worker inference limits, one-frame-in-flight processing, bounded telemetry queues/chart buffers and logout/resource cleanup remain covered by regression journeys. Device permission requests retain explicit user gestures rather than delayed automatic prompts.

These controls reduce duplicate work and bound browser resources. They do not prove that thousands of users cannot exhaust backend capacity. Real concurrency/load acceptance needs isolated staging, actual Redis/PostGIS/NestJS/BullMQ, operational limits and monitoring.

## Recovery boundaries

App and global errors use Next.js 16.4's documented `retry()` callback to re-fetch/re-render, plus explicit reload/home recovery. Raw exception messages are not rendered. Global error includes its own document and stylesheet because the root layout/providers may be unavailable. Not-found recovery remains styled and has a tested home action.

Framework error boundaries cover rendering failures; they do not guarantee recovery from browser termination, out-of-memory failure, every event handler error or infrastructure outage. Async actions still require explicit error handling. No universal crash-proofing claim is made.

See `verification.md` for final evidence and external gates.
