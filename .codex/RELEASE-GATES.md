# MFRGS Release Gates

## Gate 0 — Repository / deployment identity

- [ ] GitHub repository is `vivace9842-rgb/mfrgs-services`.
- [ ] Intended branch/commit is identified.
- [ ] Vercel project serving the MFRGS service is identified and confirmed.
- [ ] Vercel deployment is built from the intended commit.

## Gate 1 — Build/runtime

- [ ] Node runtime is compatible with the declared engine and dependencies.
- [ ] TypeScript typecheck passes.
- [ ] Production build passes.
- [ ] No competing entrypoint is unintentionally executed.

## Gate 2 — Stripe Test

- [ ] Test-mode checkout creation succeeds.
- [ ] Stripe CLI can forward an event to the intended local endpoint.
- [ ] Webhook receives the raw request body.
- [ ] `stripe.webhooks.constructEvent()` validates the signature.
- [ ] Invalid signatures return 400.
- [ ] Valid relevant events return 200 after processing.

## Gate 3 — Data integrity

- [ ] Successful checkout creates exactly one order.
- [ ] Webhook replay does not create a second order.
- [ ] Supabase constraints and RLS are verified.
- [ ] No service-role credential is exposed to the client.

## Gate 4 — Vercel production

- [ ] Deployment is READY.
- [ ] Production endpoint responds correctly.
- [ ] Production environment variables are present and correct.
- [ ] Stripe webhook endpoint points to the intended deployment.

## Gate 5 — Live payment

- [ ] Gates 0–4 are complete.
- [ ] Live mode is explicitly enabled only for final validation.
- [ ] Minimum-cost validation transaction is performed.
- [ ] Payment, webhook, persistence and confirmation are verified.

## Final status

`NOT READY` until every required gate above is evidenced as complete.
