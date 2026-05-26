# 🧪 Test Case Builder

An AI-powered web application that helps engineering teams generate structured test cases for system modernisation projects.

## What it does

Fill out a structured intake form describing your project and what you're testing. The app sends the payload to an AI via a secure Azure Function proxy and returns a full set of test cases — including edge cases and failure paths you might have missed.

---

## Architecture

```
Browser (React/Vite)
  ↓  POST /api/generateTestCases  (sanitized form data only)
Azure Function (Node.js)  ←  GENAI_API_KEY (never leaves the server)
  ↓  provider-specific HTTP call
Claude / Azure OpenAI / OpenAI
  ↑  JSON array of test cases
Azure Function
  ↑  { testCases: [...] }
Browser → renders table, allows inline status edits, CSV/JSON export
```

### Key Security Properties

| Concern | Mitigation |
|---|---|
| API key exposure | Lives in Azure Function App Settings only — never reaches the browser |
| Prompt injection | All user inputs sanitized on both client and server before prompt assembly |
| XSS from AI output | AI response rendered as React text nodes — never as `dangerouslySetInnerHTML` |
| Unauthorized access | Entire app gated behind Microsoft (Azure AD) login via SWA built-in auth |

---

## Project Structure

```
Test_Case_Builder/
├── .github/workflows/azure-static-web-apps.yml
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ProjectProfile.jsx     # Tier 1 — saved to sessionStorage
│       │   ├── TestSessionForm.jsx    # Tier 2 + Tier 3
│       │   ├── TestCaseTable.jsx      # Output table, status edits, export
│       │   └── SettingsPanel.jsx      # Runtime config (local dev only)
│       ├── hooks/useProjectProfile.js
│       ├── services/aiService.js
│       └── utils/sanitize.js
├── api/
│   └── generateTestCases/
│       ├── index.js                   # Azure Function — AI proxy
│       └── function.json
├── staticwebapp.config.json           # Auth + routing
├── main.bicep                         # Infrastructure as Code
└── README.md
```

---

## Local Development

### Prerequisites

- Node.js 20+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- An API key for Claude, Azure OpenAI, or OpenAI

### Setup

```bash
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Configure the Azure Function for local dev
cp api/local.settings.json.example api/local.settings.json
# Edit local.settings.json with your GENAI_API_KEY and provider settings

# 3. Start the Azure Functions emulator (in one terminal)
cd api
func start

# 4. Start the Vite dev server (in another terminal)
cd frontend
npm run dev
```

Vite proxies `/api/*` requests to `http://localhost:7071` automatically — see `vite.config.js`.

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deployment to Azure

### One-time Infrastructure Setup

```bash
az login
az group create --name rg-test-case-builder --location eastus

az deployment group create \
  --resource-group rg-test-case-builder \
  --template-file main.bicep \
  --parameters appName=test-case-builder genaiProvider=claude genaiModel=claude-sonnet-4-6
```

After deployment, **manually** set `GENAI_API_KEY` in the Azure Portal:

> Static Web App → Configuration → Application settings → + Add

### CI/CD (GitHub Actions)

1. In the Azure Portal, copy the **deployment token** from your Static Web App.
2. Add it as a GitHub repository secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`.
3. Push to `main` — the workflow builds, lints, and deploys automatically.

Preview environments are created automatically for each pull request.

---

## Environment Variables

Set these in Azure Function App Settings (not in code):

| Variable | Purpose |
|---|---|
| `GENAI_PROVIDER` | `claude` / `azure-openai` / `openai` |
| `GENAI_API_KEY` | API key for the chosen provider |
| `GENAI_API_URL` | Provider endpoint — leave blank for defaults |
| `GENAI_MODEL` | Model name or Azure deployment name |

For Azure AD auth (Standard tier SWA):

| Variable | Purpose |
|---|---|
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_CLIENT_SECRET` | App registration client secret |

---

## Intake Form — Field Reference

### Tier 1 — Project Profile *(sessionStorage, survives page refresh)*

| Field | Description |
|---|---|
| Project Name | Short identifier |
| System Description | What is being modernised (old → new) |
| Legacy Tech Stack | Technologies being replaced |
| Target Tech Stack | Technologies being introduced |
| Target Environments | Dev / Staging / Prod |
| Stakeholder Notes | Contacts, SLAs, constraints |

### Tier 2 — Test Session Focus *(per submission)*

| Field | Options |
|---|---|
| What are you testing? | Free text |
| Change Type(s) | Hardware · Software · Integration · Architecture · Networking · Security · Data Migration · UAT · Regression |
| Expected Behavior | Success criteria |
| Known Dependencies | Interfaces, systems |
| Known Risks | Failure modes |

### Tier 3 — Test Preferences

| Field | Options |
|---|---|
| Output Format | Steps + Result · Gherkin · Checklist |
| Depth | Basic · Standard · Exhaustive |
| Include Negative Cases | Yes · No · AI Decides |
| Output Grouping | By Feature · By Test Type · By Risk Level |

---

## Test Case Schema

```json
{
  "id": "TC-0001",
  "name": "Short title",
  "changeType": "Software",
  "description": "What is being tested",
  "preconditions": "What must be true before running",
  "steps": ["Step 1", "Step 2"],
  "expectedResult": "What should happen on pass",
  "priority": "High | Medium | Low",
  "status": "Not Run | Pass | Fail | Blocked",
  "notes": ""
}
```

---

## Roadmap

| Version | Feature |
|---|---|
| **v1.1** | Iterative refinement — follow-up prompts to expand or constrain results |
| **v1.2** | SharePoint list storage — replace sessionStorage with persistent per-user storage |
| **v1.3** | Jira-compatible export |
| **v2.0** | Multi-project support, user roles, test run tracking |

---

## Contributing

This is an internal tool. Raise issues or PRs against the `main` branch.

---

*Built with React, Azure Static Web Apps, and Azure Functions.*
