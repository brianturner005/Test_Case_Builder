/**
 * App — root layout and tab navigation.
 *
 * Tab 1: "Project" — ProjectProfile form (Tier 1)
 * Tab 2: "Generate" — TestSessionForm (Tier 2 + Tier 3) + TestCaseTable output
 *
 * SettingsPanel is accessible from any tab via the header.
 */

import React, { useState, useCallback } from "react";
import ProjectProfile from "./components/ProjectProfile.jsx";
import TestSessionForm from "./components/TestSessionForm.jsx";
import TestCaseTable from "./components/TestCaseTable.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";

const TABS = [
  { id: "project", label: "1 · Project Profile" },
  { id: "generate", label: "2 · Generate Tests" },
];

/** Incrementing TC-#### IDs, persisted to sessionStorage */
function getNextId() {
  const raw = sessionStorage.getItem("tcb_last_id");
  const last = raw ? parseInt(raw, 10) : 0;
  const next = last + 1;
  sessionStorage.setItem("tcb_last_id", String(next));
  return `TC-${String(next).padStart(4, "0")}`;
}

function assignIds(cases) {
  return cases.map((tc) => ({
    status: "Not Run",
    notes: "",
    ...tc,
    id: tc.id ?? getNextId(),
  }));
}

export default function App() {
  const [activeTab, setActiveTab] = useState("project");
  const [testCases, setTestCases] = useState([]);
  const [apiUrl, setApiUrl] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const handleResults = useCallback((cases) => {
    setTestCases(assignIds(cases));
    setActiveTab("generate"); // Switch to the generate tab to show results
  }, []);

  const handleClear = useCallback(() => setTestCases([]), []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Header ──────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--color-border)",
          padding: ".9rem 0",
          marginBottom: "1.5rem",
          background: "var(--color-surface)",
        }}
      >
        <div className="container flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: "1.2rem", marginBottom: ".1rem" }}>
              🧪 Test Case Builder
            </h1>
            <p className="text-muted text-sm">
              AI-assisted test case generation for engineering teams
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────── */}
      <main className="container" style={{ flex: 1, paddingBottom: "3rem" }}>
        {showSettings && (
          <div style={{ marginBottom: "1.25rem" }}>
            <SettingsPanel
              apiUrl={apiUrl}
              onChange={(url) => {
                setApiUrl(url);
                setShowSettings(false);
              }}
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <nav className="tabs" aria-label="Main navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Tab Content ── */}
        {activeTab === "project" && (
          <>
            <ProjectProfile />
            <div style={{ marginTop: "1.25rem", textAlign: "right" }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab("generate")}
              >
                Continue to Generate →
              </button>
            </div>
          </>
        )}

        {activeTab === "generate" && (
          <>
            <TestSessionForm
              onResults={handleResults}
              apiUrl={apiUrl}
            />

            {testCases.length > 0 && (
              <div style={{ marginTop: "1.25rem" }}>
                <TestCaseTable cases={testCases} onClear={handleClear} />
              </div>
            )}

            {testCases.length === 0 && (
              <div
                className="card"
                style={{ marginTop: "1.25rem", textAlign: "center", padding: "2.5rem 1.5rem" }}
              >
                <p className="text-muted">
                  Complete the form above and click <strong>Generate Test Cases</strong> to get started.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "1rem 0",
          textAlign: "center",
        }}
      >
        <p className="text-muted text-sm">
          Test Case Builder · Internal Tool · All data stays in your browser session
        </p>
      </footer>
    </div>
  );
}
