# Scout, academy and policy portal

Backend source remains `0067d94`; this change does not modify backend files. Existing role values are preserved: academies use `SCOUT`; federation/policy accounts use `FEDERATION_ADMIN`. Privileged accounts require authorized provisioning.

## Phase 3 audit

Before scout implementation, contract generation, lint, strict typing, 71 unit/integration tests and 24 browser journeys passed. Protected organizer dashboard, directory, creation, bracket and safety routes exist. The event wizard creates supported metadata, venue, team/capacity/prize configuration; bracket drafts provide GTI sliders and entry fees.

Editing events/saved brackets, custom sports, prize placement allocation, organizer roster/fixture APIs and incident persistence remain explicit dependencies. The safety workflow validates and filters `MATCH_PAUSE_ALERT` after the operator-controlled isolation gate, provides opt-in audio and local incident seen timestamps, and does not imply a confirmed match pause or medical dispatch. Production unsafe subscriptions stay disabled. Full organizer completion cannot be asserted while those contracts are absent.

## Implemented scout workflow

- `/scout/dashboard` renders the protected scout overview and discovery views. `/scout/feed` offers keyboard-accessible elite-prospect and talent-alert tabs. Existing `/scout/prospects` and `/scout/alerts` remain available.
- Prospects use the real bare `/scouts/feed` response with `min_gti=85` by default. Sport/district filters are sent using accepted query fields. Pages contain 20 rows, with at most five retained pages. Repeated cursors stop pagination; visible profiles are deduplicated.
- An optional local underrepresentation filter uses the response boolean and covers loaded pages only. It does not implement an unsupported demographic API or certify verification. Rural status is not applied to every prospect.
- Prospect snapshots do not expose names, verification, alert timestamps or breakthrough deltas. No such fields are invented. The profile card labels missing projections and opens an authorized passport inspector on demand.
- Alert views use the latest 50 `/scouts/alerts` records, sport/district filtering and visible-tab HTTP polling every 30 seconds. Detection time comes from `createdAt`. Alert GTI is the returned snapshot, not a fabricated delta from an earlier season.
- Acknowledgement uses the real PATCH endpoint with a stable operation UUID/body, rejects duplicate clicks, merges the scalar acknowledgement into the existing contact/profile projection, then invalidates the current viewer's alert queries. The backend acknowledgement is shared platform state, not a personal scout read receipt.
- The inspector loads `/passport/:userId` only when opened, retains actual verification status, and shows embedded sport counters with provenance/20-record limits. Passport cache keys now include viewer identity and role while preserving resource invalidation prefixes. Logout clears private caches.

## Leaderboards, dossiers and outreach

`/gti/leaderboards` and `/users/:id/dossier` do not exist. The leaderboard page clearly disables listing scope/sport/demographic controls and makes no fabricated request. No podium or ranking rows are populated from prospect-feed order. An individual national/district rank lookup uses the existing `/gti/rank/:sport/:athleteId` contract.

There is no season GTI history, signed drill evidence log, recovery-heart-rate history, verified podium history, trial-offer notification, scholarship inquiry or saved-shortlist API. The passport preview shows these dependencies and disables outreach/shortlist buttons. It does not draw a synthetic history chart or turn self-reported metrics into independently verified evidence. No claim of patent validation or full functional completion is made.

## Regional policy views and export

`/scout/heatmaps` and `/scout/regional` share the real bare `/heatmaps/regional` aggregate response. At most 500 returned rows are rendered, sorted and exported. Both null and malformed centroids remain in the accessible table and reports; only valid finite GeoJSON points produce Leaflet circles. Coordinates are converted from longitude/latitude to Leaflet latitude/longitude.

All map layers scale circle radius by athlete participation. The participation layer uses the silver token; average GTI uses gold at 85+ and blue below it; equity uses crimson below the adjustable female-participation planning target (default 25%) and blue at/above it. Legends state these rules. Table sorting and export use the same bounded dataset; sorting does not recenter the map. Scrollable tables are keyboard-focusable.

CSV and JSON exports include generation time, planning target and unknown-completeness metadata. JSON additionally reports backend count, received rows, exported rows and the rendering cap. CSV values escape quotes/delimiters and neutralize spreadsheet-formula prefixes. Object URLs are revoked after initiating downloads; failures remain visible.

The backend does not report aggregate completeness, state-qualified district identities, rural classification, academy infrastructure or causal funding eligibility. Centroid circles are not district-boundary choropleths, and the planning target does not establish a funding decision. Exports preserve these limitations.

## Release evidence and external gates

See `verification.md` for final checks. Browser journeys use the isolated contract fixture and real frontend HTTP/session/relay behavior. Live NestJS/PostGIS/Redis/BullMQ, physical wearables and authorized staging safety broadcasts remain unverified. Backend listing/history/outreach contracts and production scoring/realtime isolation remain release prerequisites.
