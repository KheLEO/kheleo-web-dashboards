# Athlete portal and Phase 1 audit

The audit and athlete update target frontend `origin/main` and backend source revision `0067d94`. Backend files are unchanged.

## Phase 1 findings and fixes

| Finding                                                                     | Resulting behavior                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Draft authentication screens simulated success and persisted browser tokens | Login and signup use real Gov-ID session handlers; opaque cookies identify server-side sessions. No persisted client token store remains.                          |
| Demo role cookie and role-switch controls could misrepresent access         | Controls and demo middleware removed. Server layouts and relay permissions enforce the authenticated backend role.                                                 |
| Duplicate socket abstractions could establish unrelated connections         | Compatibility exports use the existing SSR-safe, lazy namespace manager with exact listener cleanup.                                                               |
| Browser API abstraction lacked consistent mutation operation ownership      | Mutations preserve supplied operation UUIDs and immutable serialized bodies. The server relay injects Bearer credentials; tokens are not persisted in the browser. |
| Signup/register aliases redirected in a loop                                | `/signup` renders the real registration form; `/register` redirects there. Verification aliases enter the protected athlete flow.                                  |
| Draft passport, discovery and registration flows returned sample success    | Replaced with decoded backend queries and mutations. Failures remain visible and do not produce successful registration or fabricated identity.                    |
| Landing header overflowed at 360px                                          | Header wraps and decorative branding is reduced on narrow screens; browser overflow checks cover landing and athlete routes.                                       |

Theme changes use the existing semantic variable system and provider. No auth state is stored in theme preferences. Session refresh coordination, original expiry, route access, mutation byte/UUID reuse and server signing remain covered by integration tests.

## Athlete behavior

- `/athlete` and `/athlete/dashboard` compose the real passport card and athlete actions. Missing profiles show onboarding.
- `/athlete/passport` uses `/passport/:userId`, not the nonexistent `/users/profile`. Contact identity is shown because the backend does not supply a full name. Verification status is authoritative; raw government IDs and hashes are not exposed.
- The GTI gauge uses the passport score. The 35/25/40 breakdown becomes available after an explicit recalculation, using the backend computation response. No mutation runs on render.
- All six sports offer role and self-reported stance editing through the sport-record endpoint. Stance is stored as self-reported JSON metadata; it is not proof of sporting performance. Primary sport and profile-wide handedness are separately editable.
- The QR encodes an access-controlled scout passport URL. It does not expose a public dossier or make a government-ID verification claim.
- Discovery defaults to Ghaziabad coordinates, supports geolocation/manual campus selection and a 5–500 km radius, and displays real results on a list and client-loaded Leaflet map. Twenty-row cursor requests retain at most five pages. Load more is explicitly best-effort because backend cursor ordering is inconsistent with distance; deduplication cannot establish completeness.
- Bracket registration preserves a per-action idempotency key. Only the actual `SANDBAGGING_DETECTED` conflict opens the Fair-Play Shield. The backend suggestion powers upgrade registration; null suggestions, minimum-tier failures, capacity conflicts and transport failures remain distinct.
- `/athlete/matchmaking` accepts known tournament/bracket context, offers sport-specific roles, and uses actual join/leave/status contracts. Roster events invalidate authoritative status; reconnect refetches it. Team average GTI is calculated from the returned roster.

## Pose practice and signing

The four presets are `CRICKET_BOWLING`, `BADMINTON_SMASH`, `FOOTBALL_STRIKE`, and `ATHLETICS_SPRINT_START`. A worker processes self-hosted MediaPipe assets, with one frame in flight and bounded UI updates. Camera frames remain local; summaries retain counts and angle statistics only.

The angle ranges are provisional practice heuristics. They do not detect a cricket release, validate bowling legality, classify an entire smash/strike, or measure sprint performance. Confidence checks reject unusable landmarks. The practice percentage counts aligned visible frames; it is not calibrated biomechanical scoring.

Production submission remains rejected by the relay. Testing signed practice ingestion requires an isolated staging deployment with `APP_ENV=staging`, `STAGING_DATA_ISOLATED=true`, `DRILL_PRACTICE_INGESTION=true`, Redis, and the matching `DRILL_HMAC_SECRET`. The native Web Crypto HMAC runs on the server, where its shared secret can remain private. The request uses the backend's `timestamp` field and colon-delimited signing format. Awards are displayed only from a successful backend response. A signature authenticates the relay, not the truth of browser metrics.

## Wearables

`/athlete/iot-device` and the existing wearable route offer real Bluetooth Heart Rate Service attachment and explicitly labeled virtual Galaxy Watch/Fitness Band pairing. The simulator has normal, warning, critical, heat-exhaustion and cardiac-strain scenarios.

The standard heart-rate characteristic supplies BPM only. Missing SpO₂ and temperature remain unavailable and prevent hardware ingestion. Simulator readings are local outside isolated staging. Signed simulator ingestion requires its separate server configuration and cannot attach to real tournament/bracket/match records. UI preview severity and an actual backend ingestion response are distinguished; a match-less `MATCH_PAUSED` directive does not claim a persisted match change.

Live NestJS/PostGIS/Redis/BullMQ, physical wearable testing and approved scoring calibration remain external acceptance gates. See `verification.md` and `backend-dependencies.md`.
