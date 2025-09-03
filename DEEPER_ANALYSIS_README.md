# Deeper Analysis Feature - Azure AI Powered Stock Analysis

This feature adds comprehensive stock analysis capabilities to the FinApp AI application using Azure AI services. The feature provides three types of analysis for any stock symbol:

## 🎯 Features

### 1. Market Analysis 📊
- **Technical Analysis**: RSI, MACD, support/resistance levels, moving averages
- **Sector Analysis**: Sector performance, peer comparison, market share analysis
- **Market Context**: Overall market conditions, economic factors, institutional sentiment
- **Competitive Analysis**: Key competitors, competitive advantages, market positioning
- **Market Outlook**: Short-term and medium-term predictions, catalysts, risks

### 2. Sentiment Analysis 💭
- **News Sentiment**: Analysis of recent financial news articles
- **Social Media Sentiment**: Twitter, Reddit, financial forums sentiment tracking
- **Analyst Sentiment**: Analyst ratings, price targets, recommendation changes
- **Market Sentiment Indicators**: Options sentiment, insider trading, short interest
- **Overall Sentiment Score**: Aggregate sentiment on a 1-10 scale

### 3. Risk Analysis ⚠️
- **Financial Risks**: Credit risk, liquidity risk, profitability risks, leverage analysis
- **Market Risks**: Volatility analysis, beta calculation, correlation analysis
- **Operational Risks**: Business model risks, supply chain vulnerabilities, technology risks
- **Regulatory Risks**: Compliance risks, ESG risks, political/geopolitical risks
- **Risk Mitigation**: Company risk management practices and mitigation strategies

## 🏗️ Architecture

### Backend (Python + Azure AI)
- **FastAPI Backend**: New API endpoints for analysis services
- **Azure AI Foundry**: Powered by Azure AI agents with Bing grounding
- **Three Specialized Agents**:
  - `market_analysis_agent.py` - Market and technical analysis
  - `sentiment_analysis_agent.py` - Sentiment analysis across multiple sources
  - `risk_analysis_agent.py` - Comprehensive risk assessment

### Frontend (Next.js + React)
- **Deeper Analysis Page**: `/analysis/[symbol]` - Comprehensive analysis interface
- **Tabbed Interface**: Switch between Market, Sentiment, and Risk analysis
- **Real-time Loading**: Concurrent API calls for faster data loading
- **Responsive Design**: Mobile-friendly analysis presentation

## 🚀 Getting Started

### Prerequisites

You need the following Azure services set up:

1. **Azure AI Foundry Project**
2. **Azure OpenAI Service** (with GPT-4 or GPT-4-mini deployment)
3. **Bing Search Service** (for grounding/web search capabilities)
4. **Azure Text Analytics** (optional, for enhanced sentiment analysis)

### Environment Variables

Add these environment variables to your `.env` file:

```bash
# Required - Azure AI Foundry
PROJECT_ENDPOINT=https://your-project.cognitiveservices.azure.com/
AZURE_AI_FOUNDRY_ENDPOINT=https://your-project.cognitiveservices.azure.com/
MODEL_DEPLOYMENT_NAME=gpt-4o-mini
BING_CONNECTION_NAME=your-bing-connection-name
BING_GROUNDING_CONNECTION_ID=your-bing-grounding-connection-id

# Optional - Additional Azure credentials
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP_NAME=your-resource-group
AZURE_PROJECT_NAME=your-project-name

# Optional - Azure Text Analytics (for enhanced sentiment)
AZURE_TEXT_ANALYTICS_ENDPOINT=https://your-text-analytics.cognitiveservices.azure.com/
AZURE_TEXT_ANALYTICS_KEY=your-text-analytics-key
```

### Installation & Setup

1. **Install Python Dependencies**:
   ```bash
   cd python-backend
   pip install azure-ai-projects azure-identity azure-ai-textanalytics
   ```

2. **Start the Python Backend**:
   ```bash
   cd python-backend
   python main.py
   ```
   The backend will start on `http://localhost:8000`

3. **Start the Frontend**:
   ```bash
   npm run dev
   ```
   The frontend will start on `http://localhost:3000`

4. **Test the Setup**:
   ```bash
   cd python-backend
   python test_analysis_agents.py
   ```

## 📡 API Endpoints

### New Analysis Endpoints

- `GET /api/analysis/market/{symbol}` - Market analysis for a stock
- `GET /api/analysis/sentiment/{symbol}` - Sentiment analysis for a stock
- `GET /api/analysis/risk/{symbol}` - Risk analysis for a stock
- `GET /api/analysis/all/{symbol}` - All three analyses concurrently

### Example API Response

```json
{
  "symbol": "AAPL",
  "overall_sentiment": "Bullish",
  "sentiment_score": 7.5,
  "news_sentiment": {
    "sentiment": "Bullish",
    "score": 8.0,
    "summary": "Recent earnings beat expectations..."
  },
  "analyst_sentiment": {
    "sentiment": "Bullish", 
    "score": 7.2,
    "summary": "Analysts upgraded price targets..."
  },
  "sentiment_drivers": [
    "Strong quarterly earnings",
    "New product launches",
    "Market expansion plans"
  ],
  "generated_at": "2025-09-03T10:30:00Z"
}
```

## 🎨 Frontend Usage

### Accessing Deeper Analysis

1. **From Stock Details Page**: Click the "🔍 Deeper Analysis" button
2. **Direct URL**: Navigate to `/analysis/SYMBOL` (e.g., `/analysis/AAPL`)

### Interface Features

- **Tabbed Navigation**: Switch between Market, Sentiment, and Risk analysis
- **Real-time Data**: Live analysis generated using current market data
- **Visual Indicators**: Color-coded sentiment and risk levels
- **Detailed Breakdown**: Comprehensive analysis with specific data points
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🧪 Testing

### Test the Analysis Agents

```bash
cd python-backend
python test_analysis_agents.py
```

This will:
- Test each agent individually
- Test all agents running concurrently
- Test error handling
- Generate a `test_analysis_results.json` file with sample results

### Manual Testing

1. Start both backend and frontend servers
2. Navigate to any stock page (e.g., `/stock/AAPL`)
3. Click "Deeper Analysis" button
4. Verify all three analysis tabs load with data

## 🔧 Configuration

### Customizing Analysis

You can customize the analysis by modifying the prompt templates in each agent:

- **Market Analysis**: Edit `create_market_analysis_prompt()` in `market_analysis_agent.py`
- **Sentiment Analysis**: Edit `create_sentiment_analysis_prompt()` in `sentiment_analysis_agent.py`
- **Risk Analysis**: Edit `create_risk_analysis_prompt()` in `risk_analysis_agent.py`

### Adding New Analysis Types

To add new analysis types:

1. Create a new agent file in `python-backend/agents/`
2. Add API endpoint in `main.py`
3. Add frontend tab in `/analysis/[symbol].tsx`
4. Update the API proxy in `next.config.js`

## 🚨 Troubleshooting

### Common Issues

1. **"Failed to initialize AIProjectClient"**
   - Check your Azure AI Foundry endpoint and credentials
   - Ensure you have proper authentication set up

2. **"Bing connection not found"**
   - Verify your Bing Search service is properly connected to AI Foundry
   - Check the connection name/ID in your environment variables

3. **Analysis takes too long**
   - This is normal for the first request (agents need to initialize)
   - Subsequent requests should be faster due to agent caching

4. **Frontend can't connect to backend**
   - Ensure Python backend is running on port 8000
   - Check that API rewrites in `next.config.js` are correct

### Azure Authentication

Make sure you're authenticated with Azure:

```bash
az login
```

Or set up service principal authentication with environment variables.

## 📚 Next Steps

### Potential Enhancements

1. **Caching**: Add Redis caching for analysis results
2. **Real-time Updates**: WebSocket connections for live analysis updates
3. **PDF Reports**: Generate downloadable analysis reports
4. **Email Alerts**: Send analysis updates via email
5. **Portfolio Analysis**: Analyze entire portfolios instead of individual stocks
6. **Historical Analysis**: Track analysis changes over time

### Additional Azure Services

Consider integrating:
- **Azure Cosmos DB**: Store analysis history
- **Azure Service Bus**: Queue analysis requests
- **Azure Functions**: Serverless analysis triggers
- **Azure Logic Apps**: Workflow automation

## 🤝 Contributing

When contributing to the analysis features:

1. Follow the existing agent patterns
2. Add comprehensive error handling
3. Include unit tests for new agents
4. Update this README with new features
5. Test with multiple stock symbols

## 📄 License

This feature is part of the FinApp AI project and follows the same license terms.
