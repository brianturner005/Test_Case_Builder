/**
 * TestCaseTable — output table for generated test cases.
 *
 * Features:
 *  - Inline status editing per row
 *  - Copy all test cases to clipboard (JSON)
 *  - Export as CSV
 *  - Clear / reset results
 */

import React, { useState, useCallback } from "react";

const STATUS_OPTIONS = ["Not Run", "Pass", "Fail", "Blocked"];

const PRIORITY_CLASS = {
  High:   "badge-high",
  Medium: "badge-medium",
  Low:    "badge-low",
};

const STATUS_CLASS = {
  "Not Run": "badge-notrun",
  Pass:      "badge-pass",
  Fail:      "badge-fail",
  Blocked:   "badge-blocked",
};

function formatSteps(steps) {
  if (!steps || steps.length === 0) return "—";
  if (Array.isArray(steps)) {
    return steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  }
  return String(steps);
}

function escapeCsvCell(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(cases) {
  const headers = [
    "ID", "Name", "Change Type", "Description", "Preconditions",
    "Steps", "Expected Result", "Priority", "Status", "Notes",
  ];
  const rows = cases.map((tc) =>
    [
      tc.id, tc.name, tc.changeType, tc.description, tc.preconditions,
      Array.isArray(tc.steps) ? tc.steps.join(" | ") : tc.steps,
      tc.expectedResult, tc.priority, tc.status, tc.notes,
    ].map(escapeCsvCell).join(",")
  );
  return [headers.map(escapeCsvCell).join(","), ...rows].join("\n");
}

/** @param {{ cases: import('../services/aiService').TestCase[], onClear: () => void }} props */
export default function TestCaseTable({ cases, onClear }) {
  const [localCases, setLocalCases] = useState(cases);
  const [copied, setCopied] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // Sync when parent passes new cases
  React.useEffect(() => {
    setLocalCases(cases);
    setExpandedRow(null);
  }, [cases]);

  const updateStatus = useCallback((id, status) => {
    setLocalCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, status } : tc))
    );
  }, []);

  const updateNotes = useCallback((id, notes) => {
    setLocalCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, notes } : tc))
    );
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(localCases, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select a hidden textarea
      const el = document.createElement("textarea");
      el.value = JSON.stringify(localCases, null, 2);
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleExportCsv() {
    const csv = buildCsv(localCases);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-cases.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!localCases || localCases.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
        <p className="text-muted">No test cases yet. Fill out the form and click Generate.</p>
      </div>
    );
  }

  const passCount    = localCases.filter((tc) => tc.status === "Pass").length;
  const failCount    = localCases.filter((tc) => tc.status === "Fail").length;
  const blockedCount = localCases.filter((tc) => tc.status === "Blocked").length;
  const notRunCount  = localCases.filter((tc) => tc.status === "Not Run").length;

  return (
    <div className="card">
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between" style={{ marginBottom: "1rem", flexWrap: "wrap", gap: ".75rem" }}>
        <div>
          <h2 style={{ marginBottom: ".25rem" }}>
            Test Cases
            <span className="text-muted" style={{ fontWeight: 400, fontSize: "1rem", marginLeft: ".5rem" }}>
              ({localCases.length})
            </span>
          </h2>
          <div className="flex gap-2" style={{ fontSize: ".8rem", flexWrap: "wrap" }}>
            <span style={{ color: "#22c55e" }}>✓ {passCount} Pass</span>
            <span style={{ color: "#ef4444" }}>✗ {failCount} Fail</span>
            <span style={{ color: "#f59e0b" }}>⊘ {blockedCount} Blocked</span>
            <span className="text-muted">◌ {notRunCount} Not Run</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
            {copied ? "✓ Copied!" : "Copy JSON"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────── */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Change Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Description</th>
              <th style={{ minWidth: 80 }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {localCases.map((tc) => (
              <React.Fragment key={tc.id}>
                <tr>
                  <td>
                    <code style={{ fontSize: ".8rem", color: "var(--color-primary)" }}>{tc.id}</code>
                  </td>
                  <td style={{ fontWeight: 500, minWidth: 160 }}>{tc.name}</td>
                  <td>
                    <span className="text-sm">{tc.changeType}</span>
                  </td>
                  <td>
                    <span className={`badge ${PRIORITY_CLASS[tc.priority] ?? "badge-notrun"}`}>
                      {tc.priority}
                    </span>
                  </td>
                  <td>
                    <select
                      value={tc.status}
                      onChange={(e) => updateStatus(tc.id, e.target.value)}
                      style={{
                        width: "auto",
                        padding: ".2rem .5rem",
                        fontSize: ".82rem",
                        cursor: "pointer",
                      }}
                      aria-label={`Status for ${tc.id}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <span className="text-sm">{tc.description}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setExpandedRow(expandedRow === tc.id ? null : tc.id)
                      }
                      aria-expanded={expandedRow === tc.id}
                    >
                      {expandedRow === tc.id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>

                {expandedRow === tc.id && (
                  <tr>
                    <td colSpan={7} style={{ background: "var(--color-surface-2)", padding: "1rem 1.25rem" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <section>
                          <h4 style={{ marginBottom: ".35rem", color: "var(--color-muted)", fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                            Preconditions
                          </h4>
                          <p className="text-sm">{tc.preconditions || "—"}</p>
                        </section>

                        <section>
                          <h4 style={{ marginBottom: ".35rem", color: "var(--color-muted)", fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                            Expected Result
                          </h4>
                          <p className="text-sm">{tc.expectedResult || "—"}</p>
                        </section>

                        <section style={{ gridColumn: "1 / -1" }}>
                          <h4 style={{ marginBottom: ".35rem", color: "var(--color-muted)", fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                            Steps
                          </h4>
                          <ol style={{ paddingLeft: "1.25rem" }}>
                            {Array.isArray(tc.steps)
                              ? tc.steps.map((s, i) => (
                                  <li key={i} className="text-sm" style={{ marginBottom: ".25rem" }}>
                                    {s}
                                  </li>
                                ))
                              : <li className="text-sm">{tc.steps || "—"}</li>
                            }
                          </ol>
                        </section>

                        <section style={{ gridColumn: "1 / -1" }}>
                          <h4 style={{ marginBottom: ".35rem", color: "var(--color-muted)", fontSize: ".78rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                            Tester Notes
                          </h4>
                          <textarea
                            value={tc.notes ?? ""}
                            onChange={(e) => updateNotes(tc.id, e.target.value)}
                            placeholder="Add your notes here…"
                            style={{ minHeight: 60, fontSize: ".85rem" }}
                          />
                        </section>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
