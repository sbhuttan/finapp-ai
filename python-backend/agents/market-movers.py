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

# Load environment variables
load_dotenv()

# Import our news agent
from agents.news_agent import get_news_via_bing_grounding

app = FastAPI(title="Market Analysis AI - Python Backend", version="1.0.0")

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            

            print(gainers_url)

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
                        print(stock["symbol"])
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

@app.get("/api/stock/overview")
async def get_stock_overview(
    symbol: str = Query(..., description="Stock symbol"),
    range: str = Query("6M", description="Time range")
):
    """
    Stock overview endpoint - placeholder for now.
    You can implement this with your preferred data provider.
    """
    # For now, return mock data
    return {
        "symbol": symbol,
        "currentPrice": 150.00,
        "change": 2.50,
        "changePercent": 1.69,
        "message": "This is mock data - implement with your data provider"
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
