# Architecture

## Data flow and ownership

Browser features → TanStack Query → same-origin Axios → allowlisted Next.js relay → authenticated NestJS Axios client. Protected layouts resolve the server session and enforce backend role mappings. Navigation visibility is not authorization.

Client components never import server modules containing environment values or tokens. Backend paths are owned by feature adapters and the server route registry. Public wire contracts use Zod validators and inferred strict TypeScript types; raw responses enter as `unknown`.

## Sessions and mutations

An opaque 32-byte session ID is placed in an HttpOnly, SameSite cookie, secure over HTTPS. Redis stores token pairs, original session expiry, refresh operation IDs, rate buckets, and operation fingerprints under `kheleo:web:*`. There is no persistent browser token storage. Refresh and metadata writes share a distributed lock; refresh cannot recreate a deleted session. Session activity does not extend the original seven-day web expiry.

Mutation operations retain one UUID and serialized body for retries. Edited input creates a new action. Mutation retries are manual and preserve bytes. A 401 receives at most one refresh/retry. The backend requires idempotency on login, refresh, verification, PATCH, DELETE, and telemetry as well as registration/join/drills. Sensitive mutation payloads are not logged.

Drill signing uses `userId:drill_type:form_score:timestamp`. Telemetry signing uses the exact JSON body. Both are HMAC-SHA256, hexadecimal, through Web Crypto on the server. Shared secrets never reach the browser. Existing drill signatures cover only four fields and cannot prove browser-metric authenticity. The scoring gate rejects all production score submissions until a reviewed scoring implementation exists.

## Realtime and memory

One browser Manager multiplexes `/ws/matchmaking` and `/ws/events`. Rooms and events remain namespace-specific. Consumer registration owns handlers, desired rooms, token-renewal timers, and abort controllers. Removing the last consumer disconnects the socket; room changes reconnect because no leave-room messages exist. Logout destroys all namespace consumers.

Roster events invalidate the authoritative pool status. Reconnections refetch it to recover missed events. Event deduplication is bounded by capacity and time. The safety namespace is opt-in only after backend isolation verification; there is no frontend workaround for globally broadcast sensitive events.

Lists use 20-row pages and at most five cached pages. No cache persistence is enabled. Camera frames, landmarks, and GATT objects live in refs/workers rather than query state. Vitals charts retain 60 readings; safety alerts retain 50 received entries. Polling does not continue in hidden tabs.

## Browser resources

Pose detection runs in a dedicated worker, CPU delegate, at most 15 submitted frames per second, with one frame in flight. Two-pose detection identifies ambiguity; feedback accepts exactly one visible athlete with 33 landmarks. Only world-space angle summaries reach React, at most five times per second. Four sport presets provide clearly labeled provisional angle feedback. An alignment percentage is a practice estimate, not validated athletic performance. Signed submission is possible only in isolated staging; production scoring remains unavailable.

Page exit, hidden visibility, sign-out, and explicit stop release camera tracks, animation frames, worker resources, Bluetooth listeners/connections, and simulator timers. MediaPipe assets match the installed package; the model hash is pinned in the asset preparation script.

The HR Bluetooth characteristic parses both 8-bit and 16-bit values. Other vitals are nullable and cannot be replaced with fabricated values. Simulator and hardware share typed reading interfaces but remain visibly distinct. The telemetry dispatcher permits one request in flight, prioritizes a pending critical reading, and retains failed operations for explicit byte-identical retries.

## Theme and maps

All application colors originate in `src/app/globals.css`, including canvas, SVG, chart, and map marker colors. Tailwind exposes semantic tokens only. Radix provides focus-managed dialogs and the mobile navigation drawer. Native controls retain labels and separate described-by hints.

Maps load only on the client. GeoJSON coordinates are validated and reversed for Leaflet. Regional views use centroid circles and an accessible sortable table; no boundary polygons are invented. OSM attribution is retained, tile URLs are configurable, and no bulk/offline tile fetching occurs.

## Sequential delivery

1. Scaffold, theme, schema snapshots, sessions/relay, identity forms.
2. Passport, discovery, bracket registration, free agents, individual ranking.
3. Organizer event/bracket forms, Bluetooth/simulator, telemetry and safety gates.
4. Worker-based pose tracking, geometry, model assets, calibration-gated submission.
5. Scout/policy views, admin dependency screens, CI and release verification.

Live-service and physical-device acceptance remain separate from deterministic fixture-backed checks.
