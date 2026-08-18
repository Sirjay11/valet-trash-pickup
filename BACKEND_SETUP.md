# Production backend setup

The migration at `supabase/migrations/001_service_proof_schema.sql` is the starting point for the production service-proof data model. It has not been applied to the hosted Supabase project from this repository.

## Before applying it

1. Back up the current Supabase project.
2. Review the schema and retention rules with the database owner and counsel.
3. Confirm whether the existing `properties`, `drivers`, `events`, and `exceptions` tables contain data that must be migrated.
4. Do not place gate codes, passwords, PINs, photos, or resident data in frontend JavaScript.

## Apply and configure

Use the Supabase CLI from a trusted development environment:

```text
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Then configure:

- Supabase Auth users and profiles.
- Organization membership records.
- The private `service-evidence` Storage bucket created by the migration.
- Storage policies tied to the same organization membership function.
- A server-side job or Edge Function for audit records and notifications.
- Backups, restore testing, monitoring, and alerting.

## Production integration rule

The browser may request an action, but it must not decide whether the action is authorized. Every service event must be written through authenticated Supabase access, with the actor identity supplied by the Auth session and checked by RLS.

The current simulator still writes local demo events when no authenticated production session exists. When an authenticated profile and real property/driver UUIDs are available, the shift workflow creates a `service_run_id` and calls `API.appendServiceEvent` for each production event. Evidence uploads now use the private Storage bucket and remain pending review. A controlled offline queue and reconciliation UI are still required before field deployment.

The current client includes an IndexedDB queue for authenticated service events when connectivity is unavailable. Events carry a unique `client_event_id` so retries are idempotent. Before field use, test airplane mode, browser termination, duplicate retries, clock changes, expired sessions, and photo uploads. The queue is not a substitute for a native mobile background-sync guarantee.

## Mobile/PWA deployment

- Serve the app over HTTPS; do not use the local `http-server` setup for camera, location, or production authentication testing.
- Deploy `manifest.webmanifest`, `sw.js`, `offline.html`, and the icon asset at the same origin as the app.
- Test installation from Safari on iPhone and Chrome/Samsung Internet on Android.
- Test permission denial, revoked permissions, low battery, backgrounding, screen lock, private browsing, and storage eviction.
- Treat the visible connection status as advisory; the backend remains authoritative.
