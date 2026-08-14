import { app } from "../src/server.js";

// Let Express own JSON parsing so the same application middleware is used
// in Vercel and locally.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
