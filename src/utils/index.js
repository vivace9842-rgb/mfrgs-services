import { log, warn, error } from "./logger.js";

export function sanitize(text) {
  if (!text) return "";
  return String(text).trim();
}

export { log, warn, error };
