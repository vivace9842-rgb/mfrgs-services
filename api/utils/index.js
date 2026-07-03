export function sanitize(text) {
  if (!text) return "";
  return String(text).trim();
}

export function log(message) {
  console.log(`📘 MFRGS: ${message}`);
}

export function error(message) {
  console.error(`❌ MFRGS ERROR: ${message}`);
}
