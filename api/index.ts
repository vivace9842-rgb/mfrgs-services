import { app } from "../src/server.js";

// Stripe webhook signature verification requires the exact raw request body.
// Prevent Vercel's API layer from parsing the body before Express receives it.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
