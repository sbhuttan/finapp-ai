# Scripts Directory

This directory contains utility and test scripts for the FinApp AI project.

## Current Scripts

### Backend Integration Tests
- `validate-backend.mjs` - Validate Python backend and frontend integration
- `validate-agents.mjs` - Test agent functionality and responses

### Bing Grounding Tests  
- `test-bing-grounding.mjs` - Test Bing search grounding functionality
- `test-market-analysis-bing.mjs` - Test Market Analysis Agent with Bing integration

## Python Backend

The main AI functionality is implemented in the Python backend (`/python-backend/`):
- Persistent agents (MarketAnalysisAgent, SentimentAnalysisAgent, RiskAnalysisAgent) for optimized performance
- Bing Grounding integration for real-time market data
- Finnhub API integration for stock data
- FastAPI server with comprehensive error handling

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
