/**
 * main.bicep — Test Case Builder Azure infrastructure
 *
 * Resources:
 *   - Azure Static Web App (frontend + Azure Functions API)
 *
 * Parameters are intentionally minimal for MVP; extend as needed.
 *
 * Deploy:
 *   az deployment group create \
 *     --resource-group <rg-name> \
 *     --template-file main.bicep \
 *     --parameters appName=<name> location=<region>
 */

@description('Name of the Static Web App resource.')
param appName string = 'test-case-builder'

@description('Azure region for the Static Web App.')
param location string = resourceGroup().location

@description('Pricing tier: Free or Standard. Standard is required for custom auth and private endpoints.')
@allowed(['Free', 'Standard'])
param sku string = 'Standard'

@description('GitHub repository URL (owner/repo format).')
param repositoryUrl string = 'https://github.com/brianturner005/Test_Case_Builder'

@description('GitHub branch to deploy from.')
param branch string = 'main'

@description('AI provider: claude, azure-openai, or openai.')
@allowed(['claude', 'azure-openai', 'openai'])
param genaiProvider string = 'claude'

@description('AI model name or Azure deployment name.')
param genaiModel string = 'claude-sonnet-4-6'

// NOTE: GENAI_API_KEY is intentionally NOT a parameter — set it directly
// in the Azure portal under Function App Application Settings to avoid
// committing secrets to the template or parameter files.

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: appName
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: branch
    buildProperties: {
      appLocation: 'frontend'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
  }
}

// App settings for the Azure Functions API embedded in the Static Web App.
// These are visible only to the Function runtime — never sent to the browser.
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    GENAI_PROVIDER: genaiProvider
    GENAI_MODEL: genaiModel
    // GENAI_API_URL: leave blank for the provider's default endpoint
    // GENAI_API_KEY: set manually in the portal — do NOT add here
  }
}

// ── Outputs ────────────────────────────────────────────────────────────────

output staticWebAppName string = staticWebApp.name
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output staticWebAppResourceId string = staticWebApp.id
