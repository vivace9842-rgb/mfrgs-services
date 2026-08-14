import { app } from "../../src/server.js";

// Keep body parsing inside Express so the API behavior matches local runtime.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
