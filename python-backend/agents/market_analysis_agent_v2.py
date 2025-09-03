"""
Market Analysis Agent using Azure OpenAI
Provides comprehensive market analysis for stocks including technical analysis,
market trends, sector analysis, and competitive positioning.
"""

import os
import json
import re
import requests
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Try to import OpenAI
try:
    from openai import AzureOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ OpenAI package not available. Please install: pip install openai")

# Thread pool executor for async operations
executor = ThreadPoolExecutor(max_workers=4)

# Global client cache
_openai_client = None

class MarketAnalysis:
    def __init__(self, symbol: str, analysis: str, technical_indicators: Dict, 
                 sector_analysis: str, competitive_position: str, market_outlook: str):
        self.symbol = symbol
        self.analysis = analysis
        self.technical_indicators = technical_indicators
        self.sector_analysis = sector_analysis
        self.competitive_position = competitive_position
        self.market_outlook = market_outlook
        self.generated_at = datetime.now().isoformat()
    
    def to_dict(self):
        return {
            "symbol": self.symbol,
            "analysis": self.analysis,
            "technical_indicators": self.technical_indicators,
            "sector_analysis": self.sector_analysis,
            "competitive_position": self.competitive_position,
            "market_outlook": self.market_outlook,
            "generated_at": self.generated_at
        }

def get_required_env_vars():
    """Get required environment variables for Azure OpenAI"""
    # Try different environment variable names
    project_endpoint = os.getenv("PROJECT_ENDPOINT") or os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_AI_API_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
    model_deployment = os.getenv("MODEL_DEPLOYMENT_NAME") or os.getenv("AZURE_OPENAI_DEPLOYMENT") or "gpt-4o"
    
    if not project_endpoint:
        raise ValueError("PROJECT_ENDPOINT or AZURE_OPENAI_ENDPOINT environment variable is required")
    if not api_key:
        raise ValueError("AZURE_AI_API_KEY or AZURE_OPENAI_API_KEY environment variable is required")
    
    return project_endpoint, api_key, model_deployment

def create_openai_client():
    """Create Azure OpenAI client"""
    global _openai_client
    
    if _openai_client is not None:
        return _openai_client
    
    if not OPENAI_AVAILABLE:
        raise ImportError("OpenAI package not available. Please install: pip install openai")
    
    try:
        project_endpoint, api_key, model_deployment = get_required_env_vars()
        
        # Extract base URL from project endpoint
        if "/api/projects/" in project_endpoint:
            # Convert AI Foundry endpoint to OpenAI endpoint
            base_url = project_endpoint.split("/api/projects/")[0] + "/openai/"
        else:
            base_url = project_endpoint.rstrip('/') + "/"
            if not base_url.endswith('/openai/'):
                base_url += 'openai/'
        
        _openai_client = AzureOpenAI(
            api_key=api_key,
            api_version="2024-02-15-preview",
            azure_endpoint=base_url
        )
        
        print(f"✅ Azure OpenAI client initialized successfully")
        return _openai_client
        
    except Exception as e:
        print(f"❌ Failed to initialize Azure OpenAI client: {e}")
        raise

def create_market_analysis_prompt(symbol: str) -> str:
    """Create a specialized prompt for market analysis"""
    return f"""You are an expert financial market analyst with deep expertise in technical analysis, 
sector analysis, and market trends. Your task is to provide a comprehensive market analysis for {symbol}.

Please conduct a thorough analysis covering:

1. **Technical Analysis**:
   - Current price trends and momentum
   - Key support and resistance levels
   - Moving averages (50-day, 200-day)
   - Volume analysis
   - Technical indicators (RSI, MACD, Bollinger Bands)

2. **Sector Analysis**:
   - Current sector performance and trends
   - How {symbol} compares to sector peers
   - Sector-specific catalysts and headwinds
   - Market share and competitive positioning

3. **Market Context**:
   - Overall market conditions and sentiment
   - Economic factors affecting the stock/sector
   - Institutional holdings and analyst sentiment
   - Recent earnings performance vs expectations

4. **Competitive Analysis**:
   - Key competitors and market positioning
   - Competitive advantages/disadvantages
   - Market share trends
   - Innovation and product pipeline

5. **Market Outlook**:
   - Short-term (1-3 months) outlook
   - Medium-term (6-12 months) outlook
   - Key catalysts to watch
   - Potential risks and opportunities

Based on your analysis of current market data and trends, provide specific data points 
and cite recent market developments that support your analysis.

Structure your response as a detailed analysis with clear sections. Provide specific data points 
and reasoning for your assessments.
"""

def search_stock_info(symbol: str) -> str:
    """Simple stock info search using basic web search or mock data"""
    # For now, return a basic template - you can enhance this with actual APIs
    return f"""Current market information for {symbol}:
- This is a placeholder for real market data
- You can integrate with APIs like Alpha Vantage, Yahoo Finance, or others
- Or use web scraping for current market information
"""

def run_market_analysis(symbol: str) -> MarketAnalysis:
    """Run market analysis for a given stock symbol"""
    try:
        client = create_openai_client()
        project_endpoint, api_key, model_deployment = get_required_env_vars()
        
        # Get some basic stock info (placeholder)
        stock_info = search_stock_info(symbol)
        
        # Create the analysis prompt
        prompt = create_market_analysis_prompt(symbol)
        
        # Add stock info to the prompt
        full_prompt = f"{prompt}\n\nCurrent market information:\n{stock_info}"
        
        # Call Azure OpenAI
        response = client.chat.completions.create(
            model=model_deployment,
            messages=[
                {"role": "system", "content": "You are an expert financial market analyst."},
                {"role": "user", "content": full_prompt}
            ],
            max_tokens=3000,
            temperature=0.7
        )
        
        analysis_text = response.choices[0].message.content
        
        # Parse the analysis into structured format
        parsed_analysis = parse_market_analysis(analysis_text, symbol)
        
        return parsed_analysis
        
    except Exception as e:
        print(f"❌ Error running market analysis for {symbol}: {e}")
        # Return a fallback analysis
        return MarketAnalysis(
            symbol=symbol,
            analysis=f"Market analysis for {symbol} is currently unavailable due to technical issues. Please try again later.",
            technical_indicators={},
            sector_analysis="Analysis unavailable",
            competitive_position="Analysis unavailable", 
            market_outlook="Analysis unavailable"
        )

def parse_market_analysis(analysis_text: str, symbol: str) -> MarketAnalysis:
    """Parse the market analysis text into structured format"""
    try:
        # Extract different sections using regex patterns
        technical_indicators = extract_technical_indicators(analysis_text)
        sector_analysis = extract_section(analysis_text, "Sector Analysis", "Market Context")
        competitive_position = extract_section(analysis_text, "Competitive Analysis", "Market Outlook")
        market_outlook = extract_section(analysis_text, "Market Outlook", "")
        
        return MarketAnalysis(
            symbol=symbol,
            analysis=analysis_text,
            technical_indicators=technical_indicators,
            sector_analysis=sector_analysis,
            competitive_position=competitive_position,
            market_outlook=market_outlook
        )
        
    except Exception as e:
        print(f"⚠️ Error parsing market analysis: {e}")
        # Return basic structure if parsing fails
        return MarketAnalysis(
            symbol=symbol,
            analysis=analysis_text,
            technical_indicators={},
            sector_analysis="",
            competitive_position="",
            market_outlook=""
        )

def extract_technical_indicators(text: str) -> Dict:
    """Extract technical indicators from analysis text"""
    indicators = {}
    
    # Look for common technical indicators
    patterns = {
        "RSI": r"RSI[:\s]*(\d+\.?\d*)",
        "MACD": r"MACD[:\s]*([+-]?\d+\.?\d*)",
        "Support": r"support[:\s]*\$?(\d+\.?\d*)",
        "Resistance": r"resistance[:\s]*\$?(\d+\.?\d*)",
        "50_day_ma": r"50[- ]?day.*moving average[:\s]*\$?(\d+\.?\d*)",
        "200_day_ma": r"200[- ]?day.*moving average[:\s]*\$?(\d+\.?\d*)"
    }
    
    for indicator, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                indicators[indicator] = float(match.group(1))
            except ValueError:
                indicators[indicator] = match.group(1)
    
    return indicators

def extract_section(text: str, start_marker: str, end_marker: str) -> str:
    """Extract a specific section from the analysis text"""
    try:
        start_pattern = rf"\*?\*?{re.escape(start_marker)}\*?\*?"
        start_match = re.search(start_pattern, text, re.IGNORECASE)
        
        if not start_match:
            return ""
        
        start_pos = start_match.end()
        
        if end_marker:
            end_pattern = rf"\*?\*?{re.escape(end_marker)}\*?\*?"
            end_match = re.search(end_pattern, text[start_pos:], re.IGNORECASE)
            if end_match:
                return text[start_pos:start_pos + end_match.start()].strip()
        
        return text[start_pos:].strip()
        
    except Exception as e:
        print(f"⚠️ Error extracting section {start_marker}: {e}")
        return ""

async def get_market_analysis_async(symbol: str) -> MarketAnalysis:
    """Async wrapper for market analysis"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, run_market_analysis, symbol)

def cleanup_market_analysis_agent():
    """Clean up the market analysis agent resources"""
    global _openai_client
    
    try:
        _openai_client = None
        print("✅ Market Analysis Agent cleaned up")
    except Exception as e:
        print(f"⚠️ Error cleaning up Market Analysis Agent: {e}")

# For testing
if __name__ == "__main__":
    import asyncio
    
    async def test():
        try:
            analysis = await get_market_analysis_async("AAPL")
            print("Market Analysis Result:")
            print(json.dumps(analysis.to_dict(), indent=2))
        except Exception as e:
            print(f"Test failed: {e}")
    
    asyncio.run(test())
