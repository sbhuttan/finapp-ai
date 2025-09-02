import os
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

class StockOverview(BaseModel):
    symbol: str
    currentPrice: float
    change: float
    changePercent: float
    # Add more fields as needed

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
