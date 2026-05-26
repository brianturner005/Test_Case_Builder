/**
 * Input sanitization helpers.
 *
 * All user-supplied text is sanitized before being injected into the AI
 * prompt (server-side) and before being rendered to the DOM (client-side).
 */

/**
 * Strip characters that could break JSON string literals or act as
 * prompt-injection anchors when the text is embedded in a prompt.
 *
 * This is a defence-in-depth measure — the Azure Function applies its own
 * server-side sanitization before calling the AI.
 *
 * @param {string} value - Raw user input
 * @param {number} [maxLength=2000] - Hard cap on field length
 * @returns {string} Sanitized string
 */
export function sanitizeText(value, maxLength = 2000) {
  if (typeof value !== "string") return "";

  return value
    .slice(0, maxLength)
    // Remove ASCII control characters except tab (\x09) and newline (\x0a, \x0d)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    // Collapse excessive whitespace (more than 3 consecutive newlines → 2)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Sanitize every string field in a plain object recursively.
 * Non-string leaves are left as-is (booleans, numbers, arrays of strings, …).
 *
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
export function sanitizeObject(obj) {
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === "string" ? sanitizeText(item) : sanitizeObject(item)));
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (typeof value === "string") return [key, sanitizeText(value)];
      if (typeof value === "object" && value !== null) return [key, sanitizeObject(value)];
      return [key, value];
    })
  );
}

/**
 * Escape HTML special characters so AI-generated text can be safely
 * inserted into the DOM via textContent (React does this automatically,
 * but this is available for edge cases).
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
