/**
 * SettingsPanel — runtime configuration for local dev / testing.
 *
 * In production, the Azure Function reads the AI provider config from its
 * Application Settings — these fields are irrelevant in that context.
 *
 * For local dev, testers can override the API URL to point at a local
 * function emulator or a different environment.
 *
 * SECURITY NOTE:
 *  - API keys entered here are stored only in component state (NOT in
 *    localStorage / sessionStorage / cookies) and are never sent to the
 *    browser URL bar or logged.
 *  - In production, this panel should be inaccessible / hidden.
 */

import React, { useState } from "react";

/** @param {{ apiUrl: string, onChange: (url: string) => void }} props */
export default function SettingsPanel({ apiUrl, onChange }) {
  const [open, setOpen] = useState(false);
  const [localUrl, setLocalUrl] = useState(apiUrl ?? "");

  function handleSave() {
    onChange(localUrl.trim());
    setOpen(false);
  }

  function handleReset() {
    setLocalUrl("");
    onChange("");
    setOpen(false);
  }

  if (!open) {
    return (
      <div style={{ textAlign: "right" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
          ⚙ Settings
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
        <h3>Settings</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          ✕ Close
        </button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
        <strong>Local dev only.</strong> In production, leave the API URL blank — the app
        automatically uses <code>/api/generateTestCases</code> (Azure Function).
      </div>

      <div className="field">
        <label htmlFor="apiUrl">
          API Endpoint URL
          <span className="text-muted" style={{ fontWeight: 400, marginLeft: ".35rem" }}>
            (leave blank to use the deployed Azure Function)
          </span>
        </label>
        <input
          id="apiUrl"
          type="url"
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          placeholder="http://localhost:7071/api/generateTestCases"
        />
      </div>

      <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={handleReset}>
          Reset to Default
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}
