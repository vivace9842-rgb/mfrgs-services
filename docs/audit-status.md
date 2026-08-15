# MFRGS Services — Audit checkpoint

This file records the current engineering checkpoint and is intentionally non-production documentation.

- Main audited commit: 581cb08e9e4df5ea247a278e984eabff71b3c49a
- Primary P0: verify the Vercel project connected to `vivace9842-rgb/mfrgs-services` before deployment.
- Stripe webhook requires the exact raw request body for signature verification.
- Do not declare production readiness until Stripe Test webhook returns HTTP 200 and the resulting order is confirmed in Supabase.
