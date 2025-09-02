# Scripts Directory

This directory contains various test and utility scripts for the FinApp AI project.

## Test Scripts

### Azure AI Foundry Connection Tests
- `test-azure-connection.mjs` - Basic Azure AI Foundry connection test
- `test-updated-connection.mjs` - Updated Azure AI Foundry connection test
- `test-api-versions.mjs` - Test different API versions
- `test-base-endpoints.mjs` - Test base Azure AI Foundry endpoints
- `find-api-version.mjs` - Find working API versions

### Azure OpenAI Tests
- `test-openai-assistants.mjs` - Test Azure OpenAI Assistants API
- `test-basic-assistant.mjs` - Test basic OpenAI Assistant without tools

### Agent Tests
- `test-news-agent.mjs` - Test news agent functionality
- `test-bing-grounding.mjs` - Test Bing search grounding
- `validate-agents.mjs` - Validate agent configurations

### Exploration Scripts
- `explore-endpoints.mjs` - Explore available Azure AI Foundry endpoints

## Usage

Before running these scripts, make sure you have:

1. Set up your environment variables in `.env.local`
2. Installed dependencies with `npm install`

Run any script with:
```bash
node scripts/script-name.mjs
```

## Environment Variables Required

These scripts require the following environment variables:
- `AZURE_AI_FOUNDRY_API_KEY`
- `AZURE_AI_FOUNDRY_ENDPOINT`
- `AZURE_AI_FOUNDRY_PROJECT_ENDPOINT`
- `AZURE_OPENAI_ENDPOINT`
- `BING_SEARCH_API_KEY`
