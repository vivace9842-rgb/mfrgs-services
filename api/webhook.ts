import handleStripeWebhook from "../src/webhooks/stripeWebhook.js";

// Stripe signature verification requires the exact raw request body.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default handleStripeWebhook;
