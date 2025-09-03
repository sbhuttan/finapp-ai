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

def create_market_analysis_prompt(symbol: str) -> str:
    """Create a specialized prompt for market analysis"""
    return f"""You are an expert financial market analyst with deep expertise in technical analysis, 
sector analysis, and market trends. Your task is to provide a comprehensive market analysis for {symbol}.

Please conduct a thorough analysis covering:

1. **Technical Analysis**:
   - Current price trends and momentum
   - Key support and resistance levels (provide specific price levels)
   - Moving averages: 50-day MA and 200-day MA (provide current values)
   - Volume analysis and patterns
   - Technical indicators with specific values:
     * RSI: [provide current RSI value]
     * MACD: [provide current MACD value]
     * Bollinger Bands position
   - Chart patterns and technical signals

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

IMPORTANT: Please provide specific numerical values for technical indicators:
- RSI: [number between 0-100]
- MACD: [specific value]
- Support Level: $[price]
- Resistance Level: $[price]
- 50-day MA: $[price]
- 200-day MA: $[price]

Based on current market data and recent developments, provide specific data points 
and cite recent market developments that support your analysis.

Structure your response as a detailed analysis with clear sections. Include specific numbers 
where possible (RSI values, support/resistance levels, etc.) and provide reasoning for your assessments.
"""

def run_market_analysis(symbol: str) -> MarketAnalysis:
    """Run market analysis for a given stock symbol"""
    project_client = None
    agents_client = None
    agent = None
    
    try:
        project_endpoint, model_deployment = get_required_env_vars()
        
        # Create Azure AI Project client
        project_client = AIProjectClient(
            endpoint=project_endpoint,
            credential=DefaultAzureCredential(),
        )
        agents_client = project_client.agents
        
        print(f"✅ Azure AI Project client initialized successfully")
        
        # Create agent for market analysis
        agent = agents_client.create_agent(
            model=model_deployment,
            name=f"market-analyst-{symbol}",
            instructions="""You are an expert financial market analyst specializing in comprehensive stock analysis.
            You provide detailed technical analysis, sector insights, competitive positioning, and market outlook.
            
            CRITICAL: Always provide specific numerical values for technical indicators in your Technical Analysis section:
            - RSI: [provide exact number between 0-100]
            - MACD: [provide exact numerical value]
            - Support Level: $[provide exact price level]
            - Resistance Level: $[provide exact price level]  
            - 50-day MA: $[provide exact moving average price]
            - 200-day MA: $[provide exact moving average price]
            
            Structure your analysis with clear sections and include actionable insights with specific data points.""",
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
            market_outlook="Analysis unavailable",
            generated_at=datetime.now().isoformat()
        )
    
    finally:
        # Clean up resources
        try:
            if agent and agents_client:
                agents_client.delete_agent(agent.id)
                print("Deleted market analysis agent")
        except Exception as cleanup_error:
            print(f"⚠️ Error cleaning up agent: {cleanup_error}")
        
        try:
            if project_client:
                project_client.close()
                print("Closed project client")
        except Exception as cleanup_error:
            print(f"⚠️ Error closing project client: {cleanup_error}")

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
    
    print(f"🔍 Extracting technical indicators from text length: {len(text)}")
    
    # Enhanced patterns with more variations
    patterns = {
        "RSI": [
            r"RSI[:\s]*(\d+\.?\d*)",
            r"relative.*strength.*index[:\s]*(\d+\.?\d*)",
            r"RSI.*?(\d+\.?\d*)"
        ],
        "MACD": [
            r"MACD[:\s]*([+-]?\d+\.?\d*)",
            r"moving.*average.*convergence[:\s]*([+-]?\d+\.?\d*)",
            r"MACD.*?([+-]?\d+\.?\d*)"
        ],
        "Support": [
            r"support[:\s]*\$?(\d+\.?\d*)",
            r"support.*level[:\s]*\$?(\d+\.?\d*)",
            r"key.*support[:\s]*\$?(\d+\.?\d*)"
        ],
        "Resistance": [
            r"resistance[:\s]*\$?(\d+\.?\d*)",
            r"resistance.*level[:\s]*\$?(\d+\.?\d*)",
            r"key.*resistance[:\s]*\$?(\d+\.?\d*)"
        ],
        "50_day_ma": [
            r"50[- ]?day.*moving average[:\s]*\$?(\d+\.?\d*)",
            r"50[- ]?day.*MA[:\s]*\$?(\d+\.?\d*)",
            r"50.*day.*average[:\s]*\$?(\d+\.?\d*)"
        ],
        "200_day_ma": [
            r"200[- ]?day.*moving average[:\s]*\$?(\d+\.?\d*)",
            r"200[- ]?day.*MA[:\s]*\$?(\d+\.?\d*)",
            r"200.*day.*average[:\s]*\$?(\d+\.?\d*)"
        ]
    }
    
    # Try multiple patterns for each indicator
    for indicator, pattern_list in patterns.items():
        found = False
        for pattern in pattern_list:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                try:
                    value = float(match.group(1))
                    indicators[indicator] = value
                    print(f"✅ Found {indicator}: {value}")
                    found = True
                    break
                except (ValueError, IndexError):
                    continue
        
        if not found:
            print(f"❌ Could not find {indicator} in text")
    
    # Also look for any numerical values in technical analysis section
    tech_section = extract_section(text, "Technical Analysis", "Sector Analysis")
    if tech_section:
        print(f"📊 Technical Analysis section found: {len(tech_section)} chars")
        # Extract any numbers that might be indicators
        number_matches = re.findall(r'(\w+)[:\s]*(\d+\.?\d*)', tech_section, re.IGNORECASE)
        for term, value in number_matches:
            term_lower = term.lower()
            try:
                val = float(value)
                if 'rsi' in term_lower and 'RSI' not in indicators:
                    indicators['RSI'] = val
                elif 'macd' in term_lower and 'MACD' not in indicators:
                    indicators['MACD'] = val
                elif 'support' in term_lower and 'Support' not in indicators:
                    indicators['Support'] = val
                elif 'resistance' in term_lower and 'Resistance' not in indicators:
                    indicators['Resistance'] = val
                elif ('50' in term_lower or 'fifty' in term_lower) and 'ma' in term_lower and '50_day_ma' not in indicators:
                    indicators['50_day_ma'] = val
                elif ('200' in term_lower or 'two hundred' in term_lower) and 'ma' in term_lower and '200_day_ma' not in indicators:
                    indicators['200_day_ma'] = val
            except ValueError:
                continue
    else:
        print("❌ No Technical Analysis section found")
    
    print(f"📈 Final technical indicators extracted: {indicators}")
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
    try:
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
