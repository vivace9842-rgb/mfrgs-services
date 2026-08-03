import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const {
      email,
      company,
      number,
      country,
    } = req.body || {};

    if (!email || !company) {
      return res.status(400).json({
        error: "email e company são obrigatórios",
      });
    }

    const origin =
      req.headers.origin ||
      process.env.MFRGS_LANDING_PAGE ||
      "https://mfrgs-services.vercel.app";

    const amount = 99;
    const serviceName = "Essential Verification";

    console.log(
      `[MFRGS] Creating Stripe Checkout for ${email} (${company})`
    );

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer_email: email,

        payment_method_types: ["card"],

        metadata: {
          email,
          company,
          companyName: company,
          number: number || "",
          country: country || "",
          service: serviceName,
        },

        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amount * 100,
              product_data: {
                name: `MFRGS Corporate Intelligence - ${company}`,
                description:
                  `Official Legal Verification Report (${country || "International"})`,
              },
            },
          },
        ],

        success_url:
          `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${origin}/index.html?payment=cancelled`,
      });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error(
      "[MFRGS CHECKOUT ERROR]",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to create Stripe Checkout session.",
      details: error.message,
    });
  }
}