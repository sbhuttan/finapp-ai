# Finnhub API Integration

This project now integrates with Finnhub for real-time stock market data. The integration includes:

## Setup

1. **Get Finnhub API Key**:
   - Sign up at [Finnhub.io](https://finnhub.io/)
   - Get your free API key from the dashboard
   - Copy `.env.example` to `.env` and add your API key:
     ```
     FINNHUB_API_KEY=your_api_key_here
     ```

2. **Install Dependencies**:
   ```bash
   cd python-backend
   pip install -r requirements.txt
   ```

## Features

### Backend Utilities (`utils/finnhub_client.py`)
- `FinnhubClient`: Main API client class
- Methods for quotes, company profiles, historical data, news, and search
- Built-in error handling and rate limiting awareness
- Automatic fallback to mock data when API fails

### API Endpoints
- `GET /api/finnhub/stock/overview/{symbol}` - Complete stock overview
- `GET /api/finnhub/stock/quote/{symbol}` - Real-time quote
- `GET /api/finnhub/search?q={query}` - Stock symbol search

### Frontend Integration
- `getStockOverviewFinnhub()` - Fetch complete stock data
- `getStockQuoteFinnhub()` - Get real-time quotes
- `searchStocksFinnhub()` - Search for stocks
- Automatic fallback to mock data for development

## Data Sources

### Real Data (Finnhub)
- Real-time stock quotes
- Company profiles and metrics
- Historical price data
- Company news and earnings
- Market data for major exchanges

### Fallback Data (Mock)
- Used when Finnhub API is unavailable
- Provides consistent development experience
- Covers same data structure as Finnhub

## Rate Limits

Finnhub free tier includes:
- 60 API calls/minute
- 1000 API calls/month for advanced features
- Real-time data for US markets

The client includes automatic rate limiting awareness and error handling.

## Error Handling

The integration includes comprehensive error handling:
1. API failures automatically fall back to mock data
2. Network errors are logged and handled gracefully
3. Invalid symbols return appropriate error responses
4. Rate limit exceeded scenarios are handled properly

## Usage Example

```python
from utils.finnhub_client import FinnhubClient

client = FinnhubClient()
quote = await client.get_quote("AAPL")
profile = await client.get_company_profile("AAPL")
overview = await client.get_stock_overview("AAPL", "6M")
```

## Environment Variables

Required:
- `FINNHUB_API_KEY` - Your Finnhub API key

Optional:
- `PORT` - FastAPI server port (default: 8000)
- `HOST` - FastAPI server host (default: 0.0.0.0)
