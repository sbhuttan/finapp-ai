"""
Market Analysis Agent using Azure AI Projects
Provides comprehensive market analysis for stocks including technical analysis,
market trends, sector analysis, and competitive positioning.
"""

import os
import json
import re
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

# Thread pool executor for async operations
executor = ThreadPoolExecutor(max_workers=4)

# Global client cache
_project_client = None
_agents_client = None

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
    """Get required environment variables for Azure AI Projects"""
    project_endpoint = os.getenv("PROJECT_ENDPOINT")
    model_deployment = os.getenv("MODEL_DEPLOYMENT_NAME")
    
    if not project_endpoint:
        raise ValueError("PROJECT_ENDPOINT environment variable is required")
    if not model_deployment:
        raise ValueError("MODEL_DEPLOYMENT_NAME environment variable is required")
    
    return project_endpoint, model_deployment

def create_project_client():
    """Create Azure AI Project client"""
    global _project_client, _agents_client
    
    if _project_client is not None:
        return _project_client, _agents_client
    
    try:
        project_endpoint, model_deployment = get_required_env_vars()
        
        _project_client = AIProjectClient(
            endpoint=project_endpoint,
            credential=DefaultAzureCredential(),
        )
        _agents_client = _project_client.agents
        
        print(f"✅ Azure AI Project client initialized successfully")
        return _project_client, _agents_client
        
    except Exception as e:
        print(f"❌ Failed to initialize Azure AI Project client: {e}")
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

Based on current market data and recent developments, provide specific data points 
and cite recent market developments that support your analysis.

Structure your response as a detailed analysis with clear sections. Include specific numbers 
where possible (RSI values, support/resistance levels, etc.) and provide reasoning for your assessments.
"""

def run_market_analysis(symbol: str) -> MarketAnalysis:
    """Run market analysis for a given stock symbol"""
    try:
        project_client, agents_client = create_project_client()
        project_endpoint, model_deployment = get_required_env_vars()
        
        with project_client:
            # Create agent for market analysis
            agent = agents_client.create_agent(
                model=model_deployment,
                name=f"market-analyst-{symbol}",
                instructions="""You are an expert financial market analyst specializing in comprehensive stock analysis.
                You provide detailed technical analysis, sector insights, competitive positioning, and market outlook.
                Always provide specific data points, numerical values, and clear reasoning for your assessments.
                Structure your analysis with clear sections and include actionable insights.""",
                tools=[],  # No special tools needed for this analysis
            )
            
            print(f"Created market analysis agent, ID: {agent.id}")
            
            # Create thread for communication
            thread = agents_client.threads.create()
            print(f"Created thread, ID: {thread.id}")
            
            # Create the analysis prompt
            prompt = create_market_analysis_prompt(symbol)
            
            # Create message to thread
            message = agents_client.messages.create(
                thread_id=thread.id,
                role="user",
                content=prompt,
            )
            print(f"Created message, ID: {message.id}")
            
            # Create and process agent run
            run = agents_client.runs.create_and_process(
                thread_id=thread.id, 
                agent_id=agent.id
            )
            print(f"Market analysis run finished with status: {run.status}")
            
            if run.status == "failed":
                print(f"Run failed: {run.last_error}")
                raise Exception(f"Analysis failed: {run.last_error}")
            
            # Get the analysis result
            messages = agents_client.messages.list(thread_id=thread.id)
            analysis_text = ""
            
            for msg in messages:
                if msg.role == "assistant" and msg.text_messages:
                    analysis_text = msg.text_messages[-1].text.value
                    break
            
            # Clean up the agent
            agents_client.delete_agent(agent.id)
            print("Deleted market analysis agent")
            
            # Parse the analysis into structured format
            parsed_analysis = parse_market_analysis(analysis_text, symbol)
            
            return parsed_analysis
        
    except Exception as e:
        print(f"❌ Error running market analysis for {symbol}: {e}")
        # Return a fallback analysis
        return MarketAnalysis(
            symbol=symbol,
            analysis=f"Market analysis for {symbol} is currently unavailable due to technical issues: {str(e)}. Please try again later.",
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
    global _project_client, _agents_client
    
    try:
        _project_client = None
        _agents_client = None
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
