/**
 * useProjectProfile — sessionStorage-backed project context hook.
 *
 * Tier 1 data (project name, system description, tech stacks, etc.) is
 * persisted across the browser tab session so users don't have to re-enter
 * it for every test run.  It is cleared automatically when the tab closes.
 *
 * v1.2 roadmap: swap the read/write helpers below to call a SharePoint list
 * instead of sessionStorage without touching component code.
 */

import { useState, useCallback } from "react";
import { sanitizeObject } from "../utils/sanitize.js";

const STORAGE_KEY = "tcb_project_profile";

/** Default / empty project profile shape */
const DEFAULT_PROFILE = {
  projectName: "",
  systemDescription: "",
  legacyStack: "",
  targetStack: "",
  targetEnvironments: [], // "Dev" | "Staging" | "Prod"
  stakeholderNotes: "",
};

function readFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function writeToStorage(profile) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

/**
 * @returns {{
 *   profile: typeof DEFAULT_PROFILE,
 *   updateProfile: (patch: Partial<typeof DEFAULT_PROFILE>) => void,
 *   saveProfile: () => void,
 *   clearProfile: () => void,
 *   isDirty: boolean,
 * }}
 */
export function useProjectProfile() {
  const [profile, setProfile] = useState(readFromStorage);
  const [isDirty, setIsDirty] = useState(false);

  const updateProfile = useCallback((patch) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const saveProfile = useCallback(() => {
    setProfile((prev) => {
      const sanitized = sanitizeObject(prev);
      writeToStorage(sanitized);
      return sanitized;
    });
    setIsDirty(false);
  }, []);

  const clearProfile = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setProfile(DEFAULT_PROFILE);
    setIsDirty(false);
  }, []);

  return { profile, updateProfile, saveProfile, clearProfile, isDirty };
}
