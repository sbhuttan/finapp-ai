import os
import random
import json
import aiohttp
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Import our agents
from agents.news_agent import get_news_via_bing_grounding, cleanup_financial_news_agent
from agents.market_analysis_agent_projects import get_market_analysis_async, cleanup_market_analysis_agent
from agents.sentiment_analysis_agent_projects import get_sentiment_analysis_async, cleanup_sentiment_analysis_agent
from agents.risk_analysis_agent_projects import get_risk_analysis_async, cleanup_risk_analysis_agent

# Import Finnhub utilities
from utils.finnhub_client import get_stock_overview as finnhub_get_stock_overview, get_stock_quote, search_stocks

app = FastAPI(title="Market Analysis AI - Python Backend", version="1.0.0")

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add shutdown event handler for cleanup
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources when the application shuts down"""
    print("🔄 Application shutting down, cleaning up resources...")
    cleanup_financial_news_agent()
    cleanup_market_analysis_agent()
    cleanup_sentiment_analysis_agent()
    cleanup_risk_analysis_agent()
    print("✅ Cleanup completed")

class NewsItem(BaseModel):
    id: str
    source: str
    headline: str
    url: str
    publishedAt: str
    summary: Optional[str] = None

class TopMover(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    changePercent: float

class TopMoversResponse(BaseModel):
    gainers: List[TopMover]
    losers: List[TopMover]

class StockOverview(BaseModel):
    symbol: str
    currentPrice: float
    change: float
    changePercent: float
    # Add more fields as needed

# Finnhub API configuration
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

async def fetch_finnhub_top_movers() -> TopMoversResponse:
    """
    Fetch real top gainers and losers from Finnhub API
    """
    if not FINNHUB_API_KEY:
        print("⚠️  FINNHUB_API_KEY not found, using mock data")
        return generate_mock_movers()
    
    try:
        async with aiohttp.ClientSession() as session:
            # Fetch top gainers
            gainers_payload = {
                "filters": [
                    {
                        "key": "change",
                        "operator": ">",
                        "value": 0
                    }
                ],
                "sort": "change",
                "asc": False,
                "limit": 5
            }
            
            # Fetch top losers
            losers_payload = {
                "filters": [
                    {
                        "key": "change",
                        "operator": "<",
                        "value": 0
                    }
                ],
                "sort": "change",
                "asc": True,
                "limit": 5
            }
            
            # Make concurrent requests for gainers and losers
            gainers_url = f"{FINNHUB_BASE_URL}/scan/stock-screener?token={FINNHUB_API_KEY}"
            losers_url = f"{FINNHUB_BASE_URL}/scan/stock-screener?token={FINNHUB_API_KEY}"
            
            headers = {"Content-Type": "application/json"}
            
            async with session.post(gainers_url, json=gainers_payload, headers=headers) as gainers_response:
                if gainers_response.status != 200:
                    raise HTTPException(status_code=gainers_response.status, detail="Failed to fetch gainers from Finnhub")
                gainers_data = await gainers_response.json()
            
            async with session.post(losers_url, json=losers_payload, headers=headers) as losers_response:
                if losers_response.status != 200:
                    raise HTTPException(status_code=losers_response.status, detail="Failed to fetch losers from Finnhub")
                losers_data = await losers_response.json()
            
            # Process the response data
            gainers = []
            if gainers_data.get("result"):
                for stock in gainers_data["result"]:
                    if stock.get("symbol") and stock.get("price") is not None:
                        gainers.append(TopMover(
                            symbol=stock["symbol"],
                            name=stock.get("companyName", stock["symbol"]),
                            price=float(stock["price"]),
                            change=float(stock.get("change", 0)),
                            changePercent=float(stock.get("changePercent", 0))
                        ))
            
            losers = []
            if losers_data.get("result"):
                for stock in losers_data["result"]:
                    if stock.get("symbol") and stock.get("price") is not None:
                        losers.append(TopMover(
                            symbol=stock["symbol"],
                            name=stock.get("companyName", stock["symbol"]),
                            price=float(stock["price"]),
                            change=float(stock.get("change", 0)),
                            changePercent=float(stock.get("changePercent", 0))
                        ))
            
            return TopMoversResponse(gainers=gainers, losers=losers)
            
    except aiohttp.ClientError as e:
        print(f"❌ Finnhub API request failed: {str(e)}")
        print("🔄 Falling back to mock data")
        return generate_mock_movers()
    except Exception as e:
        print(f"❌ Error processing Finnhub data: {str(e)}")
        print("🔄 Falling back to mock data")
        return generate_mock_movers()

@app.get("/")
async def root():
    return {"message": "Market Analysis AI - Python Backend", "status": "running"}

@app.get("/api/stock/news", response_model=List[NewsItem])
async def get_stock_news(
    symbol: str = Query(..., description="Stock symbol (e.g., AAPL)"),
    limit: int = Query(3, description="Number of news items to return", ge=1, le=25),
    lookbackDays: int = Query(7, description="Days to look back for news", ge=1, le=30)
):
    """
    Get stock news using Azure AI Foundry Agent with Bing grounding.
    This endpoint uses the news_bing_grounding.py implementation.
    """
    try:
        print(f"🔍 Getting news for {symbol} via Python agent...")
        print(f"📊 Limit: {limit}, Lookback: {lookbackDays} days")
        
        # Use the Bing grounding agent to get real news
        news_items = await get_news_via_bing_grounding(symbol, limit, lookbackDays)
        
        return news_items
        
    except Exception as e:
        print(f"❌ Error getting news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")

def generate_mock_movers() -> TopMoversResponse:
    """Generate realistic mock market movers data"""
    stocks = [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corp."},
        {"symbol": "NVDA", "name": "NVIDIA Corp."},
        {"symbol": "AMZN", "name": "Amazon.com Inc."},
        {"symbol": "TSLA", "name": "Tesla Inc."},
        {"symbol": "GOOGL", "name": "Alphabet Inc."},
        {"symbol": "META", "name": "Meta Platforms Inc."},
        {"symbol": "BRK.B", "name": "Berkshire Hathaway"},
        {"symbol": "LLY", "name": "Eli Lilly and Co."},
        {"symbol": "V", "name": "Visa Inc."},
        {"symbol": "UNH", "name": "UnitedHealth Group"},
        {"symbol": "XOM", "name": "Exxon Mobil Corp."},
        {"symbol": "JPM", "name": "JPMorgan Chase & Co."},
        {"symbol": "JNJ", "name": "Johnson & Johnson"},
        {"symbol": "WMT", "name": "Walmart Inc."},
        {"symbol": "PG", "name": "Procter & Gamble Co."},
        {"symbol": "MA", "name": "Mastercard Inc."},
        {"symbol": "HD", "name": "The Home Depot Inc."},
        {"symbol": "BAC", "name": "Bank of America Corp."},
        {"symbol": "ABBV", "name": "AbbVie Inc."}
    ]
    
    # Generate movements for all stocks
    movers = []
    for stock in stocks:
        price = round(50 + random.random() * 200, 2)  # $50-$250
        change_percent = round((random.random() - 0.5) * 10, 2)  # -5% to +5%
        change = round((price * change_percent) / 100, 2)
        
        movers.append(TopMover(
            symbol=stock["symbol"],
            name=stock["name"],
            price=price,
            change=change,
            changePercent=change_percent
        ))
    
    # Sort by percentage change
    sorted_movers = sorted(movers, key=lambda x: x.changePercent, reverse=True)
    
    return TopMoversResponse(
        gainers=sorted_movers[:5],  # Top 5 gainers
        losers=sorted_movers[-5:][::-1]  # Top 5 losers (reversed to show worst first)
    )

@app.get("/api/analysis/market/{symbol}")
async def get_market_analysis(symbol: str):
    """
    Get comprehensive market analysis for a stock symbol using Azure AI
    """
    try:
        print(f"📊 Getting market analysis for {symbol}...")
        analysis = await get_market_analysis_async(symbol.upper())
        print(f"✅ Market analysis completed for {symbol}")
        return analysis.to_dict()
    except Exception as e:
        print(f"❌ Error getting market analysis for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get market analysis: {str(e)}")

@app.get("/api/analysis/sentiment/{symbol}")
async def get_sentiment_analysis(symbol: str):
    """
    Get comprehensive sentiment analysis for a stock symbol using Azure AI
    """
    try:
        print(f"💭 Getting sentiment analysis for {symbol}...")
        analysis = await get_sentiment_analysis_async(symbol.upper())
        print(f"✅ Sentiment analysis completed for {symbol}")
        return analysis.to_dict()
    except Exception as e:
        print(f"❌ Error getting sentiment analysis for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sentiment analysis: {str(e)}")

@app.get("/api/analysis/risk/{symbol}")
async def get_risk_analysis(symbol: str):
    """
    Get comprehensive risk analysis for a stock symbol using Azure AI
    """
    try:
        print(f"⚠️ Getting risk analysis for {symbol}...")
        analysis = await get_risk_analysis_async(symbol.upper())
        print(f"✅ Risk analysis completed for {symbol}")
        return analysis.to_dict()
    except Exception as e:
        print(f"❌ Error getting risk analysis for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get risk analysis: {str(e)}")

@app.get("/api/analysis/all/{symbol}")
async def get_all_analysis(symbol: str):
    """
    Get all three types of analysis (market, sentiment, risk) for a stock symbol
    """
    try:
        print(f"🔍 Getting comprehensive analysis for {symbol}...")
        
        # Run all analyses concurrently
        import asyncio
        market_task = get_market_analysis_async(symbol.upper())
        sentiment_task = get_sentiment_analysis_async(symbol.upper())
        risk_task = get_risk_analysis_async(symbol.upper())
        
        market_analysis, sentiment_analysis, risk_analysis = await asyncio.gather(
            market_task, sentiment_task, risk_task
        )
        
        print(f"✅ Comprehensive analysis completed for {symbol}")
        
        return {
            "symbol": symbol.upper(),
            "market_analysis": market_analysis.to_dict(),
            "sentiment_analysis": sentiment_analysis.to_dict(),
            "risk_analysis": risk_analysis.to_dict(),
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"❌ Error getting comprehensive analysis for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get comprehensive analysis: {str(e)}")

@app.get("/api/stock/news/{symbol}")
async def get_stock_news(symbol: str, limit: int = Query(10, description="Number of news items")):
    """
    Get financial news for a stock symbol using Azure AI News Agent
    """
    try:
        print(f"📰 Getting news for {symbol} (limit: {limit})...")
        news_items = await get_news_via_bing_grounding(symbol.upper(), limit)
        print(f"✅ Retrieved {len(news_items)} news items for {symbol}")
        return [item.to_dict() for item in news_items]
    except Exception as e:
        print(f"❌ Error getting news for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get news: {str(e)}")

@app.get("/api/market/top-movers", response_model=TopMoversResponse)
async def get_top_movers():
    """
    Get top gaining and losing stocks from Finnhub API.
    Falls back to mock data if API key is not available or API fails.
    """
    try:
        print("📈 Getting top market movers from Finnhub...")
        
        # Fetch real data from Finnhub API
        movers_data = await fetch_finnhub_top_movers()
        
        print(f"✅ Retrieved {len(movers_data.gainers)} gainers and {len(movers_data.losers)} losers")
        return movers_data
        
    except Exception as e:
        print(f"❌ Error getting top movers: {str(e)}")
        print("🔄 Falling back to mock data")
        return generate_mock_movers()

@app.get("/api/finnhub/stock/overview/{symbol}")
async def get_finnhub_stock_overview(symbol: str):
    """
    Get comprehensive stock overview from Finnhub API
    """
    try:
        print(f"📊 Getting Finnhub stock overview for {symbol}...")
        overview = finnhub_get_stock_overview(symbol.upper())
        
        if overview.get('error'):
            raise HTTPException(status_code=400, detail=overview['error'])
        
        print(f"✅ Retrieved Finnhub overview for {symbol}")
        return overview
        
    except Exception as e:
        print(f"❌ Error getting Finnhub overview for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock overview: {str(e)}")

@app.get("/api/finnhub/stock/quote/{symbol}")
async def get_finnhub_stock_quote(symbol: str):
    """
    Get real-time stock quote from Finnhub API
    """
    try:
        print(f"💹 Getting Finnhub quote for {symbol}...")
        quote = get_stock_quote(symbol.upper())
        
        if not quote:
            raise HTTPException(status_code=404, detail=f"No quote data found for {symbol}")
        
        print(f"✅ Retrieved Finnhub quote for {symbol}")
        return {
            "symbol": symbol.upper(),
            "quote": quote,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error getting Finnhub quote for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock quote: {str(e)}")

@app.get("/api/finnhub/search")
async def search_finnhub_stocks(q: str = Query(..., description="Search query")):
    """
    Search for stocks using Finnhub API
    """
    try:
        print(f"🔍 Searching Finnhub for: {q}")
        results = search_stocks(q)
        
        print(f"✅ Found {len(results.get('result', []))} results for '{q}'")
        return results
        
    except Exception as e:
        print(f"❌ Error searching Finnhub for {q}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search stocks: {str(e)}")

@app.get("/api/stock/overview")
async def get_stock_overview(
    symbol: str = Query(..., description="Stock symbol"),
    range: str = Query("6M", description="Time range")
):
    """
    Enhanced stock overview endpoint using Finnhub data
    """
    try:
        print(f"📊 Getting enhanced stock overview for {symbol}...")
        
        # Get data from Finnhub
        finnhub_data = finnhub_get_stock_overview(symbol.upper())
        
        if finnhub_data.get('error'):
            raise HTTPException(status_code=400, detail=finnhub_data['error'])
        
        # Transform Finnhub data to match frontend expectations
        quote = finnhub_data.get('quote', {})
        profile = finnhub_data.get('profile', {})
        
        overview = {
            "symbol": symbol.upper(),
            "quote": {
                "currentPrice": quote.get('c', 0),  # Current price
                "change": quote.get('d', 0),        # Change
                "changePercent": quote.get('dp', 0), # Change percent
                "high": quote.get('h', 0),          # High price of the day
                "low": quote.get('l', 0),           # Low price of the day
                "open": quote.get('o', 0),          # Open price of the day
                "previousClose": quote.get('pc', 0), # Previous close price
                "timestamp": quote.get('t', 0)      # Timestamp
            },
            "profile": profile,
            "financials": finnhub_data.get('financials', {}),
            "news": finnhub_data.get('news', []),
            "earnings": finnhub_data.get('earnings', []),
            "history": finnhub_data.get('history', {}),
            "last_updated": finnhub_data.get('last_updated')
        }
        
        print(f"✅ Retrieved enhanced overview for {symbol}")
        return overview
        
    except Exception as e:
        print(f"❌ Error getting enhanced overview for {symbol}: {str(e)}")
        # Fallback to mock data
        return {
            "symbol": symbol.upper(),
            "quote": {
                "currentPrice": 150.00,
                "change": 2.50,
                "changePercent": 1.69,
                "high": 152.00,
                "low": 148.00,
                "open": 149.00,
                "previousClose": 147.50,
                "timestamp": int(datetime.now().timestamp())
            },
            "profile": {"name": f"{symbol.upper()} Inc.", "exchange": "NASDAQ"},
            "message": f"Using mock data due to error: {str(e)}"
        }

@app.get("/api/earnings")
async def get_earnings():
    """Earnings endpoint - placeholder"""
    return {"message": "Earnings endpoint - implement as needed"}

@app.get("/api/index-quote")
async def get_index_quote():
    """Index quote endpoint - placeholder"""
    return {"message": "Index quote endpoint - implement as needed"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
