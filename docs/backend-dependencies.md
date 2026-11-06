# Backend integration and deployment prerequisites

**READY FOR PRODUCTION DEPLOYMENT** for the synchronized application release. There are no unresolved Phase 1–4 backend capability gates. [Verification](verification.md) records current evidence; [production deployment](production-deployment.md) contains exact infrastructure, environment, bootstrap and TLS commands.

The configured relay supports authentication/profile aliases, passport evidence, owned tournament/bracket operations, cursor discovery, pool/roster/result operations, calibrated signed drills, BLE/simulator telemetry, confidential safety lifecycle, scoped GTI, scout dossier/outreach/shortlists, heatmaps and administrative governance/audit/health. [Compiled controller inventory](contracts/backend-routes.json) records 65 methods across 53 paths. Route coverage verifies all 54 relay rules and the four auth session operations against it.

Production requires PostgreSQL 16/PostGIS with all committed migrations, persistent native TCP Redis 7 with noeviction, mounted RSA keys, stable identity pepper, matching private HMAC secrets and exact HTTPS CORS. Apply migrations through `pnpm exec prisma migrate deploy`; the final additive migration preserves recovered safety alert IDs/source/baseline provenance.

Supabase Auth confirmed-contact proof is required in production. Both services need the same project URL/public key; the frontend now requests and verifies OTP before forwarding `identityAccessToken`. Configure SMTP/email token templates and SMS delivery if offering phone login. This verifies contact ownership, while independently reviewed government identity controls staff access. Bootstrap SUPER_ADMIN with a temporary invitation, then approve organizers/scouts through audited governance.

`SAFE_EVENTS_VERIFIED=true` is an operator marker; backend handshake/room authorization always applies. Scoring/hardware/staging flags no longer disable valid signed ingestion. Simulator data and single-sensor physiological baselines remain explicitly labeled. No browser HMAC secret, camera/device authenticity, payment settlement or clinical certification is claimed.

The fresh [backend CI run](https://github.com/KheLEO/kheleo-core-backend/actions/runs/42140215984) validates native services, queue-derived GTI, private safety rooms, organizer/scout/admin operations, outbox drain and non-root container startup on Node 22/24. Browser fixture E2E separately establishes UI behavior; neither substitutes for owner SMTP/SMS, TLS, physical sensor and capacity checks after deployment.
