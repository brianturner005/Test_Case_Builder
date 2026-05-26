/**
 * TestSessionForm — Tier 2 + Tier 3 form.
 *
 * Tier 2 — Test Session Focus: what is being tested this run.
 * Tier 3 — Test Preferences: shapes AI output format and depth.
 *
 * On submit, calls aiService.generateTestCases with the merged payload
 * (project profile + session fields) and returns results via onResults().
 */

import React, { useState, useRef, useCallback } from "react";
import { generateTestCases } from "../services/aiService.js";
import { sanitizeObject } from "../utils/sanitize.js";
import { useProjectProfile } from "../hooks/useProjectProfile.js";

const CHANGE_TYPES = [
  "Hardware",
  "Software",
  "Integration",
  "Architecture",
  "Networking",
  "Security",
  "Data Migration",
  "UAT",
  "Regression",
];

const DEFAULT_SESSION = {
  // Tier 2
  whatAreTesting: "",
  changeTypes: [],
  expectedBehavior: "",
  knownDependencies: "",
  knownRisks: "",
  // Tier 3
  outputFormat: "steps", // steps | gherkin | checklist
  depth: "standard",    // basic | standard | exhaustive
  includeNegative: "ai", // yes | no | ai
  outputGrouping: "feature", // feature | type | risk
};

/** @param {{ onResults: (cases: import('../services/aiService').TestCase[]) => void, apiUrl?: string }} props */
export default function TestSessionForm({ onResults, apiUrl }) {
  const { profile } = useProjectProfile();
  const [form, setForm] = useState(DEFAULT_SESSION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Debounce guard: track last submit time to prevent double-fire
  const lastSubmitRef = useRef(0);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChangeTypeToggle(type) {
    setForm((prev) => {
      const current = prev.changeTypes;
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...prev, changeTypes: next };
    });
  }

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Debounce: ignore if last submit was < 2 s ago
      const now = Date.now();
      if (now - lastSubmitRef.current < 2000) return;
      lastSubmitRef.current = now;

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const sanitizedProfile = sanitizeObject(profile);
        const sanitizedForm = sanitizeObject(form);

        const cases = await generateTestCases(
          { projectProfile: sanitizedProfile, sessionForm: sanitizedForm },
          apiUrl,
          abortRef.current.signal
        );

        onResults(cases);
      } catch (err) {
        if (err.name === "AbortError") return; // user cancelled
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    },
    [profile, form, apiUrl, onResults]
  );

  function handleCancel() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <form className="card" onSubmit={handleSubmit} aria-label="Test Session Form">
      {/* ── Tier 2 ─────────────────────────────────────────── */}
      <h2 style={{ marginBottom: ".25rem" }}>Test Session</h2>
      <p className="text-muted text-sm" style={{ marginBottom: "1.25rem" }}>
        Describe what you're testing in this session.
      </p>

      <div className="field">
        <label htmlFor="whatAreTesting">What are you testing? *</label>
        <textarea
          id="whatAreTesting"
          name="whatAreTesting"
          value={form.whatAreTesting}
          onChange={handleChange}
          required
          maxLength={2000}
          placeholder="e.g. Migration of user authentication from on-prem LDAP to Azure AD B2C across all three environments."
          style={{ minHeight: 100 }}
        />
      </div>

      <div className="field">
        <label>Change Type(s) *</label>
        <div
          className="chip-group"
          role="group"
          aria-label="Change types"
        >
          {CHANGE_TYPES.map((type) => (
            <label key={type} className="chip-label">
              <input
                type="checkbox"
                checked={form.changeTypes.includes(type)}
                onChange={() => handleChangeTypeToggle(type)}
              />
              {type}
            </label>
          ))}
        </div>
        {form.changeTypes.length === 0 && (
          <p className="text-muted text-sm mt-1">Select at least one change type.</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="expectedBehavior">Expected Behavior / Success Criteria *</label>
        <textarea
          id="expectedBehavior"
          name="expectedBehavior"
          value={form.expectedBehavior}
          onChange={handleChange}
          required
          maxLength={2000}
          placeholder="e.g. All users can log in with their Microsoft credentials. SSO tokens are issued correctly. No existing sessions break."
          style={{ minHeight: 90 }}
        />
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="knownDependencies">Known Dependencies / Interfaces</label>
          <textarea
            id="knownDependencies"
            name="knownDependencies"
            value={form.knownDependencies}
            onChange={handleChange}
            maxLength={1000}
            placeholder="e.g. Azure AD tenant, existing user directory, downstream SSO-enabled apps"
          />
        </div>

        <div className="field">
          <label htmlFor="knownRisks">Known Risks / Failure Modes</label>
          <textarea
            id="knownRisks"
            name="knownRisks"
            value={form.knownRisks}
            onChange={handleChange}
            maxLength={1000}
            placeholder="Optional — e.g. token clock-skew, legacy app incompatibility with OAuth 2.0"
          />
        </div>
      </div>

      <hr className="divider" />

      {/* ── Tier 3 ─────────────────────────────────────────── */}
      <h3 style={{ marginBottom: "1rem" }}>Test Preferences</h3>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="outputFormat">Output Format</label>
          <select id="outputFormat" name="outputFormat" value={form.outputFormat} onChange={handleChange}>
            <option value="steps">Steps + Expected Result</option>
            <option value="gherkin">Gherkin (Given / When / Then)</option>
            <option value="checklist">Simple Checklist</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="depth">Depth</label>
          <select id="depth" name="depth" value={form.depth} onChange={handleChange}>
            <option value="basic">Basic — key paths only</option>
            <option value="standard">Standard — recommended</option>
            <option value="exhaustive">Exhaustive — all edge cases</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="includeNegative">Include Negative / Failure Cases</label>
          <select id="includeNegative" name="includeNegative" value={form.includeNegative} onChange={handleChange}>
            <option value="ai">Let AI Decide</option>
            <option value="yes">Always Include</option>
            <option value="no">Exclude</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="outputGrouping">Output Grouping</label>
          <select id="outputGrouping" name="outputGrouping" value={form.outputGrouping} onChange={handleChange}>
            <option value="feature">By Feature</option>
            <option value="type">By Test Type</option>
            <option value="risk">By Risk Level</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
        {loading && (
          <button type="button" className="btn btn-ghost" onClick={handleCancel}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || form.changeTypes.length === 0}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Generating…
            </>
          ) : (
            "Generate Test Cases"
          )}
        </button>
      </div>
    </form>
  );
}
