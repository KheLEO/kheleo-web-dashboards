# Login readiness and CI stability

The failed CI artifacts showed two distinct states: the login success message while the URL remained `/login`, and an axe `heading-order` violation on the action hub during passport loading. Both behaviors have dedicated fixes and regression coverage.

Shared forms render `data-hydrated="false"` with disabled controls in server HTML. A hydration-safe client snapshot enables the controls and changes the marker to `true` after React attaches. This prevents edits and native submission before React Hook Form and submit handlers are ready.

The Playwright login helper waits for that marker, checks the government-ID field retains its value, verifies the session POST succeeds, then allows 20 seconds for the role-specific redirect. The regression journey holds JavaScript responses to test the unhydrated state and checks both sequential typing and fast fills. It does not use a fixed readiness sleep or `networkidle`.

Successful authentication schedules one `router.replace()` without immediately refreshing the old login route. A transition that remains on `/login` for ten seconds falls back to a full same-origin role navigation. Unmounting cancels that timer. Authentication is not repeated by this fallback, and the target workspace still enforces the server session and role.

Playwright uses one worker because the contract fixture has shared resettable state. This also keeps `--repeat-each=3` serial on hosts with many CPU cores. Test timeout is 90 seconds, default expectations 15 seconds, navigation 60 seconds, and server startup 180 seconds. The existing longer mission-route-loop timeout remains in place.

The test server remains `next dev`. Production startup rejects the test fixture's in-memory session store, and Socket.IO's public origin is fixed at build time. A production E2E setup would need a separately configured build and isolated Redis; production session requirements are not relaxed here. The production build is checked independently.

The athlete accessibility/overflow journey includes the dashboard, passport, discovery, matchmaking, drill catalog, IoT hub and existing settings/legacy aliases at 360px. The action hub uses an h2 and its action cards use h3 headings, keeping the outline valid even while the preceding passport is loading. The regression test explicitly holds the passport response and runs axe before releasing it. Existing desktop mission-route coverage and modal/drawer journeys remain intact. Overflow and axe assertions are not relaxed.

Verification:

```sh
pnpm build
pnpm test:e2e
pnpm exec playwright test tests/e2e/workspaces.spec.ts --repeat-each=3
```

A CI-mode repeat can use `CI=true` with `--retries=0` to ensure retries do not hide flakes. These are frontend fixture-backed checks, not live NestJS/Redis integration or proof of production capacity.
