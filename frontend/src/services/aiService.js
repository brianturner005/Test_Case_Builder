/**
 * aiService — provider-agnostic AI call abstraction.
 *
 * The browser NEVER sends AI provider credentials.  This module posts the
 * sanitized form payload to the Azure Function proxy (/api/generateTestCases)
 * which holds the API key in its Application Settings and handles the actual
 * provider call.
 *
 * If a custom base URL is supplied (from SettingsPanel for local dev), it
 * overrides the default Azure Function path.
 */

const DEFAULT_API_PATH = "/api/generateTestCases";

/**
 * @typedef {Object} GenerateRequest
 * @property {import('../hooks/useProjectProfile').ProfileShape} projectProfile
 * @property {Object} sessionForm  - Tier 2 + Tier 3 fields
 */

/**
 * @typedef {Object} TestCase
 * @property {string} id
 * @property {string} name
 * @property {string} changeType
 * @property {string} description
 * @property {string} preconditions
 * @property {string[]} steps
 * @property {string} expectedResult
 * @property {'High'|'Medium'|'Low'} priority
 * @property {'Not Run'|'Pass'|'Fail'|'Blocked'} status
 * @property {string} notes
 */

/**
 * Generate test cases via the Azure Function proxy.
 *
 * @param {GenerateRequest} payload
 * @param {string} [overrideUrl]   - Optional custom endpoint (dev/testing)
 * @param {AbortSignal} [signal]   - AbortController signal for cancellation
 * @returns {Promise<TestCase[]>}
 */
export async function generateTestCases(payload, overrideUrl, signal) {
  const url = overrideUrl?.trim() || DEFAULT_API_PATH;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let message = `API error: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON body — keep status message
    }
    throw new Error(message);
  }

  const data = await res.json();

  // Normalise: the function can return { testCases: [...] } or a bare array
  const cases = Array.isArray(data) ? data : data.testCases ?? [];

  if (!Array.isArray(cases)) {
    throw new Error("Unexpected response shape from API");
  }

  return cases;
}
