/**
 * ProjectProfile — Tier 1 form.
 *
 * Captures persistent project context (project name, system description,
 * tech stacks, target environments, stakeholder notes).  Data is saved to
 * sessionStorage so it pre-loads on the next visit within the same tab.
 */

import React from "react";
import { useProjectProfile } from "../hooks/useProjectProfile.js";

const ENVIRONMENTS = ["Dev", "Staging", "Prod"];

export default function ProjectProfile() {
  const { profile, updateProfile, saveProfile, clearProfile, isDirty } =
    useProjectProfile();

  function handleChange(e) {
    const { name, value } = e.target;
    updateProfile({ [name]: value });
  }

  function handleEnvToggle(env) {
    const current = profile.targetEnvironments ?? [];
    const next = current.includes(env)
      ? current.filter((e) => e !== env)
      : [...current, env];
    updateProfile({ targetEnvironments: next });
  }

  function handleSave(e) {
    e.preventDefault();
    saveProfile();
  }

  return (
    <form className="card" onSubmit={handleSave} aria-label="Project Profile">
      <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
        <div>
          <h2>Project Profile</h2>
          <p className="text-muted text-sm mt-1">
            Saved to your browser session — pre-loads on return visits.
          </p>
        </div>
        {isDirty && (
          <span className="badge" style={{ background: "rgba(245,158,11,.15)", color: "#f59e0b" }}>
            Unsaved changes
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="projectName">Project Name *</label>
        <input
          id="projectName"
          name="projectName"
          value={profile.projectName}
          onChange={handleChange}
          placeholder="e.g. Pitwall IQ Modernisation"
          required
          maxLength={200}
        />
      </div>

      <div className="field">
        <label htmlFor="systemDescription">
          System Description *
          <span className="text-muted" style={{ fontWeight: 400, marginLeft: ".35rem" }}>
            — what is being modernised?
          </span>
        </label>
        <textarea
          id="systemDescription"
          name="systemDescription"
          value={profile.systemDescription}
          onChange={handleChange}
          placeholder="Describe the current (legacy) system and what the new system will look like after modernisation."
          required
          maxLength={2000}
          style={{ minHeight: 110 }}
        />
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="legacyStack">Legacy Tech Stack</label>
          <textarea
            id="legacyStack"
            name="legacyStack"
            value={profile.legacyStack}
            onChange={handleChange}
            placeholder="e.g. Windows Server 2012, SQL Server 2008, .NET Framework 4.5"
            maxLength={1000}
            style={{ minHeight: 80 }}
          />
        </div>

        <div className="field">
          <label htmlFor="targetStack">Target Tech Stack</label>
          <textarea
            id="targetStack"
            name="targetStack"
            value={profile.targetStack}
            onChange={handleChange}
            placeholder="e.g. Azure Kubernetes Service, Azure SQL Managed Instance, .NET 8"
            maxLength={1000}
            style={{ minHeight: 80 }}
          />
        </div>
      </div>

      <div className="field">
        <label>Target Environments</label>
        <div className="chip-group" role="group" aria-label="Target environments">
          {ENVIRONMENTS.map((env) => (
            <label key={env} className="chip-label">
              <input
                type="checkbox"
                checked={profile.targetEnvironments?.includes(env) ?? false}
                onChange={() => handleEnvToggle(env)}
              />
              {env}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="stakeholderNotes">Team / Stakeholder Notes</label>
        <textarea
          id="stakeholderNotes"
          name="stakeholderNotes"
          value={profile.stakeholderNotes}
          onChange={handleChange}
          placeholder="Optional — key contacts, known constraints, SLAs, acceptance criteria, etc."
          maxLength={2000}
        />
      </div>

      <hr className="divider" />

      <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={clearProfile}
        >
          Clear
        </button>
        <button type="submit" className="btn btn-primary btn-sm">
          Save Profile
        </button>
      </div>
    </form>
  );
}
