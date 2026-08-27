# MFRGS Engineering Squad

## Purpose

This file defines the collective engineering protocol for finishing `mfrgs-services` safely and moving it from theory to verified practice.

These roles are engineering responsibilities, not application agents used by the MFRGS product itself.

## Collective roles

- **ARCH** — senior architecture and integration coordinator
- **BACK** — backend, Express, TypeScript, API and middleware
- **STRIPE** — Stripe Checkout, PaymentIntent, webhooks, signatures, idempotency, Test/Live
- **SUPA** — Supabase schema, RLS, persistence and data integrity
- **DEVOPS** — GitHub, branches, builds, Node runtime and Vercel deployments
- **QA** — adversarial testing, regression and end-to-end verification
- **SEC** — secrets, permissions, attack surface and production security

## Operating rules

1. All roles work from the same repository state and shared evidence.
2. No role may declare a subsystem working from source inspection alone.
3. Every important conclusion must be backed by a reproducible test, deployment result, log, or repository evidence.
4. Contradictory findings are escalated to ARCH and investigated before changes continue.
5. Do not make destructive changes to `main` to solve an unverified problem.
6. Do not use Stripe Live for debugging.
7. Never expose secrets, API keys, webhook signing secrets, service-role keys, or credentials in commits, logs, reports, or chat.
8. Preserve working behavior unless a change is justified by a verified defect.
9. Prefer small, reversible changes over broad rewrites.
10. After a correction, test the downstream consequence before moving to the next subsystem.

## Status vocabulary

- **CONFIRMED** — directly verified with evidence.
- **PROBABLE** — strong evidence but not yet verified end-to-end.
- **BLOCKED** — requires an external action or missing capability.
- **NOT READY** — a production criterion has not passed.
- **READY** — all release criteria have passed.

## Current release gate

The first release gate is deliberately Test Mode only:

`Stripe Test Checkout -> signed webhook -> signature validation -> order persistence in Supabase -> HTTP 200 -> duplicate/replay protection`

Only after this gate passes should Live payment validation be considered.

## Known critical areas

- Verify the Vercel project is actually the project serving the MFRGS service domain.
- Verify the deployed commit matches the intended GitHub `main` state.
- Verify Node runtime compatibility with `package.json`.
- Verify the Stripe webhook receives the original raw body before signature verification.
- Verify the webhook signing secret belongs to the endpoint actually receiving the event.
- Verify Stripe API version consistency.
- Verify checkout idempotency and webhook replay idempotency.
- Verify Supabase persistence and constraints.
- Verify deployment readiness before payment testing.

## Definition of Done

The service is not declared production-ready until QA can independently verify:

1. Checkout can be created in Stripe Test Mode.
2. A test payment completes.
3. `checkout.session.completed` reaches the intended webhook.
4. Stripe signature verification succeeds with the exact raw request body.
5. The order is persisted exactly once in Supabase.
6. Replaying the same event does not create a duplicate order.
7. Invalid signatures are rejected.
8. The Vercel deployment is READY and serves the intended project.
9. No critical security finding remains.
10. Live payment is not enabled until all preceding checks pass.
