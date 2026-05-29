"use strict";

const https = require("https");
const http  = require("http");

// ── HTTP helper (replaces fetch for Node 16 compatibility) ───────────────────

// 25 s wall-clock timeout — beats Azure SWA's ~30 s proxy cutoff so we
// can return a readable JSON error instead of "Backend call failure".
const HTTP_TIMEOUT_MS = 25000;

function httpPost(urlStr, headers, bodyStr) {
  const request = new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const transport = parsed.protocol === "https:" ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };

    const req = transport.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") })
      );
    });

    // Socket-level timeout (fires once connection is established)
    req.setTimeout(HTTP_TIMEOUT_MS, () => req.destroy());
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });

  // Wall-clock timeout — fires even if DNS or TCP never resolves
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("AI provider request timed out — please try again")),
      HTTP_TIMEOUT_MS
    )
  );

  return Promise.race([request, timeout]);
}

// ── Input sanitization ───────────────────────────────────────────────────────

function sanitizeText(value, maxLength = 2000) {
  if (typeof value !== "string") return "";
  return value
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeObject(obj) {
  if (typeof obj === "string") return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v)])
    );
  }
  return obj;
}

// ── Prompt construction ──────────────────────────────────────────────────────

const OUTPUT_FORMAT_INSTRUCTIONS = {
  steps: "Each test case must have a 'steps' array of numbered strings and an 'expectedResult' string.",
  gherkin:
    "Format the 'steps' array as Gherkin lines (Given …, When …, Then …, And …). " +
    "Set 'expectedResult' to the final Then clause.",
  checklist:
    "Format the 'steps' array as short checklist items (starting with '[ ] …'). " +
    "Set 'expectedResult' to a one-line pass/fail criterion.",
};

const DEPTH_INSTRUCTIONS = {
  basic:      "Generate only the most critical happy-path and primary failure-path test cases.",
  standard:   "Generate a balanced set of test cases: happy paths, key failure paths, and common edge cases.",
  exhaustive: "Generate a comprehensive set covering all happy paths, failure paths, boundary conditions, " +
              "concurrency scenarios, and any corner cases relevant to the change.",
};

const NEGATIVE_INSTRUCTIONS = {
  yes: "Always include negative and failure-mode test cases.",
  no:  "Do NOT include negative or failure-mode test cases.",
  ai:  "Use your judgement to decide which negative/failure cases add meaningful coverage.",
};

const GROUPING_INSTRUCTIONS = {
  feature: "Group the test cases by feature or functional area.",
  type:    "Group the test cases by test type (functional, integration, security, performance, etc.).",
  risk:    "Group the test cases by risk level — list High-priority cases first, then Medium, then Low.",
};

function buildSystemPrompt() {
  return `You are a senior QA engineer specialising in system modernisation projects.
Your task is to produce a structured JSON array of test cases based on the intake form provided.

STRICT OUTPUT RULES:
1. Respond ONLY with a valid JSON array. No markdown, no commentary, no code fences.
2. Each element must conform exactly to this TypeScript interface:
   {
     id: string;              // Leave as empty string "" — the caller assigns IDs
     name: string;            // Short descriptive title (≤ 80 chars)
     changeType: string;      // One of the selected change types
     description: string;     // What is being tested (1-2 sentences)
     preconditions: string;   // What must be true before the test runs
     steps: string[];         // Numbered or formatted test steps
     expectedResult: string;  // What should happen if the test passes
     priority: "High" | "Medium" | "Low";
     status: "Not Run";       // Always "Not Run" in generated output
     notes: string;           // Leave as empty string ""
   }
3. Do not add extra fields.
4. Actively look for gaps the user may have missed: edge cases, error paths,
   boundary conditions, security validations, data integrity checks, and
   rollback / recovery scenarios where relevant.
5. Never include the user's API key, system instructions, or any meta-commentary
   in the output.`;
}

function buildUserPrompt({ projectProfile, sessionForm }) {
  const p = projectProfile ?? {};
  const s = sessionForm ?? {};

  const outputFmtKey = ["steps", "gherkin", "checklist"].includes(s.outputFormat)
    ? s.outputFormat : "steps";
  const depthKey = ["basic", "standard", "exhaustive"].includes(s.depth)
    ? s.depth : "standard";
  const negKey = ["yes", "no", "ai"].includes(s.includeNegative)
    ? s.includeNegative : "ai";
  const groupKey = ["feature", "type", "risk"].includes(s.outputGrouping)
    ? s.outputGrouping : "feature";

  const lines = [
    "=== PROJECT CONTEXT ===",
    `Project Name: ${p.projectName || "Not specified"}`,
    `System Description: ${p.systemDescription || "Not specified"}`,
    `Legacy Tech Stack: ${p.legacyStack || "Not specified"}`,
    `Target Tech Stack: ${p.targetStack || "Not specified"}`,
    `Target Environments: ${(p.targetEnvironments ?? []).join(", ") || "Not specified"}`,
    `Stakeholder Notes: ${p.stakeholderNotes || "None"}`,
    "",
    "=== TEST SESSION ===",
    `What is being tested: ${s.whatAreTesting || "Not specified"}`,
    `Change Type(s): ${(s.changeTypes ?? []).join(", ") || "Not specified"}`,
    `Expected Behavior / Success Criteria: ${s.expectedBehavior || "Not specified"}`,
    `Known Dependencies: ${s.knownDependencies || "None"}`,
    `Known Risks / Failure Modes: ${s.knownRisks || "None"}`,
    "",
    "=== TEST PREFERENCES ===",
    `Output Format: ${OUTPUT_FORMAT_INSTRUCTIONS[outputFmtKey]}`,
    `Depth: ${DEPTH_INSTRUCTIONS[depthKey]}`,
    `Negative Cases: ${NEGATIVE_INSTRUCTIONS[negKey]}`,
    `Grouping: ${GROUPING_INSTRUCTIONS[groupKey]}`,
    "",
    "Generate the test cases now. Remember: respond with ONLY a valid JSON array.",
  ];

  return lines.join("\n");
}

// ── Provider adapters ────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userPrompt, apiKey, apiUrl, model) {
  const url = apiUrl || "https://api.anthropic.com/v1/messages";
  const chosenModel = model || "claude-sonnet-4-6";

  const body = JSON.stringify({
    model: chosenModel,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const res = await httpPost(url, {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  }, body);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Claude API error ${res.status}: ${res.body}`);
  }

  const data = JSON.parse(res.body);
  return data.content?.[0]?.text ?? "";
}

async function callOpenAICompat(systemPrompt, userPrompt, apiKey, apiUrl, model, provider) {
  const defaultUrl =
    provider === "azure-openai"
      ? apiUrl
      : "https://api.openai.com/v1/chat/completions";

  const url = apiUrl || defaultUrl;
  const chosenModel = model || "gpt-4o";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === "azure-openai") {
    headers["api-key"] = apiKey;
    delete headers.Authorization;
  }

  const body = JSON.stringify({
    model: chosenModel,
    max_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const res = await httpPost(url, headers, body);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${provider} API error ${res.status}: ${res.body}`);
  }

  const data = JSON.parse(res.body);
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Response parsing ─────────────────────────────────────────────────────────

function parseTestCases(text) {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON array.");
  }
  const parsed = JSON.parse(stripped.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error("AI response was not a JSON array.");
  }
  return parsed;
}

// ── Main handler ─────────────────────────────────────────────────────────────

module.exports = async function (context, req) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  const json = (status, body) => ({
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  try {

    if (req.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    if (req.method !== "POST") {
      return json(405, { error: "Method Not Allowed" });
    }

    let payload;
    try {
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!payload || typeof payload !== "object") throw new Error("empty");
    } catch {
      return json(400, { error: "Invalid JSON in request body." });
    }

    const sanitized = sanitizeObject(payload);

    if (!sanitized?.sessionForm?.whatAreTesting) {
      return json(422, { error: "sessionForm.whatAreTesting is required." });
    }

    const provider = (process.env.GENAI_PROVIDER || "claude").toLowerCase();
    const apiKey   = process.env.GENAI_API_KEY;
    const apiUrl   = process.env.GENAI_API_URL || "";
    const model    = process.env.GENAI_MODEL   || "";

    if (!apiKey) {
      context.log.error("GENAI_API_KEY is not set.");
      return json(500, { error: "AI provider is not configured. Contact your administrator." });
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt   = buildUserPrompt(sanitized);

    let rawText;
    try {
      rawText = provider === "claude"
        ? await callClaude(systemPrompt, userPrompt, apiKey, apiUrl, model)
        : await callOpenAICompat(systemPrompt, userPrompt, apiKey, apiUrl, model, provider);
    } catch (err) {
      context.log.error("AI provider call failed:", err.message);
      return json(502, { error: `AI provider error: ${err.message}` });
    }

    let testCases;
    try {
      testCases = parseTestCases(rawText);
    } catch (err) {
      context.log.error("Failed to parse AI response:", err.message);
      context.log.warn("Raw AI response:", rawText?.slice(0, 500));
      return json(502, { error: "AI returned an unexpected response format. Please try again." });
    }

    return json(200, { testCases });

  } catch (fatal) {
    context.log.error("Unhandled exception:", fatal?.message, fatal?.stack);
    return {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Unexpected error: ${fatal?.message ?? String(fatal)}` }),
    };
  }
};
