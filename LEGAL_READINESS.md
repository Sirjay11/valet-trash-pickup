# ValetFlow legal-readiness worklist

This file is an engineering handoff, not legal advice. A lawyer familiar with the operating jurisdictions, landlord/tenant law, employment law, privacy law, and waste regulations must approve the production program.

## Changes made in this pass

- Removed passwords, field PINs, and property gate codes from the public JavaScript bundle.
- Removed the visible test-credential and auto-fill controls.
- Removed browser-controlled persisted login sessions.
- Admin login now delegates credential verification to Supabase Auth.
- Disabled field-porter shared-PIN login until a backend identity workflow exists.
- Marked seeded events, notifications, location, and violation records as simulated.
- Prevented AI questions and answers from being inserted as HTML.
- Restored browser zoom and improved several form labels and image descriptions.
- Changed violation events to `reviewStatus: 'pending'` with no automatic fine amount.

## Still required before handling real data

### Identity and authorization

1. Create real Supabase Auth users and a server-side profile table.
2. Add organization, property, and role membership tables.
3. Enable Row Level Security on every table; deny by default.
4. Enforce tenant/property membership in policies and server-side functions.
5. Add MFA for administrators, session expiry, revocation, throttling, password reset, and access-review logs.
6. Replace the disabled porter PIN flow with individual accounts or managed device authentication.

### Evidence and violation workflow

1. Store photos in private object storage, never in the public bundle.
2. Record capture time, authenticated user/device, location accuracy, source, hash, and an append-only history.
3. Do not call simulated or client-supplied values “verified.”
4. Require human review before a resident notice or fee decision.
5. Store the property-specific lease/fee authority, notice version, delivery record, dispute, appeal, correction, and final decision.
6. Obtain counsel approval for fee, notice, lease, hazardous-material, and landlord/tenant rules in every jurisdiction.

### Privacy and workforce monitoring

1. Produce a data map covering residents, employees, property managers, photos, unit numbers, complaints, location, notifications, vendors, and exports.
2. Define purpose, lawful basis, notice, access, retention, deletion, correction, export, and disclosure rules for each data type.
3. Publish separate privacy notices for residents, employees/contractors, and business customers.
4. Give workers clear notice of location tracking, schedule monitoring, photo capture, and access logs; define off-duty behavior and retention.
5. Add data-subject request handling and a documented breach-response process.
6. Execute vendor data-processing/security agreements and review Supabase, messaging, storage, analytics, and error-monitoring settings.

### Evidence review operations

1. Define which evidence requires supervisor approval and the required review time.
2. Train reviewers to approve only evidence that supports the specific service event.
3. Preserve rejected evidence and the rejection reason according to the approved retention policy; do not silently replace it.
4. Give clients a clear distinction between submitted, reviewed, rejected, and disputed evidence.
5. Test that signed evidence links expire and that users cannot open another organization’s files.

### Messaging, payments, accessibility, and security

- Implement documented SMS consent, sender identification, STOP/help handling, suppression lists, and message records before sending automated texts.
- If card payments are introduced, use a PCI-compliant hosted payment flow and complete the applicable PCI DSS validation; do not store card data.
- Add a content-security policy, HTTPS-only deployment, dependency pinning/integrity controls, secure cookies where applicable, rate limiting, monitoring, backups, and restore testing.
- Complete keyboard, screen-reader, focus-management, contrast, responsive, and WCAG 2.2 AA testing.
- Add a public privacy notice, terms, acceptable-use rules, accessibility statement, support/contact path, and incident-notification process after counsel review.

## Release gate

Do not use this build to make resident charges, issue violation notices, monitor workers, or claim GPS/photo proof until the backend authorization, evidence chain, privacy notices, retention controls, dispute process, accessibility review, and jurisdiction-specific legal review are complete.
