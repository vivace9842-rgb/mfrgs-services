import handleStripeWebhook from "../src/webhooks/stripeWebhook.js";

// Stripe signs the exact request bytes. Vercel must not parse the body first.
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function readRawBody(
  req: AsyncIterable<Uint8Array>
): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export default async function webhook(
  req: AsyncIterable<Uint8Array> & { body?: unknown; rawBody?: Buffer },
  res: Parameters<typeof handleStripeWebhook>[1]
): Promise<void> {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : await readRawBody(req);

    // The shared Express handler accepts a Buffer and verifies it directly.
    (req as { body: Buffer; rawBody: Buffer }).body = rawBody;
    (req as { body: Buffer; rawBody: Buffer }).rawBody = rawBody;

    await handleStripeWebhook(
      req as Parameters<typeof handleStripeWebhook>[0],
      res
    );
  } catch (error) {
    console.error("[WEBHOOK_RAW_BODY_ERROR]", error);
    res.status(500).json({ error: "Unable to read webhook request body" });
  }
}
