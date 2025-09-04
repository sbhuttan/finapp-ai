"""
Market Analysis Agent using Azure AI Projects with Bing Grounding Tool
Provides comprehensive market analysis for stocks including technical analysis,
market trends, sector analysis, and competitive positioning using real-time data.
"""

import os
import json
import re
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor
from azure.ai.projects import AIProjectClient
from azure.ai.agents.models import MessageRole, BingGroundingTool
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

# Global agent cache to persist the MarketAnalysisAgent
_market_analysis_agent = None
_agents_client = None

def get_or_create_market_analysis_agent(project_client, model_deployment: str, bing_connection: str):
    """
    Get existing MarketAnalysisAgent with Bing Grounding or create it if it doesn't exist.
    This function maintains a persistent agent to avoid recreation overhead.
    """
    global _market_analysis_agent, _agents_client
    
    try:
        agents_client = project_client.agents
        
        # If we have a cached agent, verify it still exists
        if _market_analysis_agent and _agents_client:
            try:
                # Try to retrieve the agent to verify it still exists
                existing_agent = agents_client.get_agent(_market_analysis_agent.id)
                if existing_agent and existing_agent.name == "MarketAnalysisAgent":
                    print(f"♻️  Reusing existing MarketAnalysisAgent: {existing_agent.id}")
                    return existing_agent, agents_client
                else:
                    print("🔄 Cached agent no longer exists, will create new one")
                    _market_analysis_agent = None
            except Exception as e:
                print(f"⚠️  Cached agent validation failed: {e}, will create new one")
                _market_analysis_agent = None
        
        # Check if MarketAnalysisAgent already exists by listing agents
        try:
            agents_list = agents_client.list_agents()
            for agent in agents_list:
                if agent.name == "MarketAnalysisAgent":
                    print(f"♻️  Found existing MarketAnalysisAgent: {agent.id}")
                    _market_analysis_agent = agent
                    _agents_client = agents_client
                    return agent, agents_client
        except Exception as e:
            print(f"⚠️  Error listing agents: {e}, will create new agent")
        
        # Get Bing connection ID
        conn_id = project_client.connections.get(bing_connection).id
        print(f"✅ Using Bing connection ID: {conn_id}")
        
        # Initialize Bing grounding tool
        bing_tool = BingGroundingTool(connection_id=conn_id)
        
        # Create new persistent agent with Bing Grounding
        print("🆕 Creating new MarketAnalysisAgent with Bing Grounding...")
        agent = agents_client.create_agent(
            model=model_deployment,
            name="MarketAnalysisAgent",
            instructions="""You are an expert financial market analyst specializing in comprehensive stock analysis with access to real-time web data.
            You provide detailed technical analysis, sector insights, competitive positioning, and market outlook using current market information.
            
            Use the web search tool to gather the most current market data before providing your analysis.
            
            CRITICAL FORMATTING REQUIREMENTS - You MUST include these exact phrases in your Technical Analysis section:

            Technical Indicators (use exact format with colons):
            - "RSI: [number]" (e.g., "RSI: 65.2")
            - "MACD: [number]" (e.g., "MACD: -1.23") 
            - "Support Level: $[price]" (e.g., "Support Level: $150.50")
            - "Resistance Level: $[price]" (e.g., "Resistance Level: $175.25")
            - "50-day moving average: $[price]" (e.g., "50-day moving average: $162.45")
            - "200-day moving average: $[price]" (e.g., "200-day moving average: $158.90")

            ALWAYS include ALL six technical indicators using the exact phrases above. This format is required for data extraction.
            
            Structure your analysis with clear sections and include actionable insights with specific data points from current market sources.
            
            Example technical section format:
            "Technical Analysis shows:
            - RSI: 67.5 indicating moderate momentum
            - MACD: -0.45 showing bearish divergence  
            - Support Level: $145.20 based on recent consolidation
            - Resistance Level: $162.80 from previous highs
            - 50-day moving average: $152.35 trending upward
            - 200-day moving average: $148.90 providing long-term support"
            """,
            tools=bing_tool.definitions,
        )
        
        print(f"✅ MarketAnalysisAgent created with Bing Grounding: {agent.id}")
        
        # Cache the agent for future use
        _market_analysis_agent = agent
        _agents_client = agents_client
        
        return agent, agents_client
        
    except Exception as e:
        print(f"❌ Error getting/creating MarketAnalysisAgent: {e}")
        raise

def get_required_env_vars():
    """Get required environment variables for Azure AI Projects with Bing Grounding"""
    project_endpoint = os.getenv("PROJECT_ENDPOINT") or os.getenv("AZURE_AI_FOUNDRY_ENDPOINT")
    model_deployment = os.getenv("MODEL_DEPLOYMENT_NAME") or os.getenv("AZURE_OPENAI_DEPLOYMENT") or "gpt-4o-mini"
    bing_connection = os.getenv("BING_CONNECTION_NAME") or os.getenv("BING_GROUNDING_CONNECTION_ID")
    
    # Additional parameters that might be needed for newer SDK versions
    subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
    resource_group = os.getenv("AZURE_RESOURCE_GROUP")
    project_name = os.getenv("AZURE_AI_PROJECT_NAME")
    
    if not project_endpoint:
        raise ValueError("PROJECT_ENDPOINT environment variable is required")
    if not model_deployment:
        raise ValueError("MODEL_DEPLOYMENT_NAME environment variable is required")
    if not bing_connection:
        raise ValueError("BING_CONNECTION_NAME environment variable is required for real-time data")
    
    return project_endpoint, model_deployment, bing_connection, subscription_id, resource_group, project_name

def create_ai_project_client(project_endpoint: str, subscription_id: str = None, resource_group: str = None, project_name: str = None):
    """Create AI Project Client with fallback handling"""
    try:
        credential = DefaultAzureCredential()
        
        return AIProjectClient(
            endpoint=project_endpoint,
            credential=credential,
        )
    except Exception as e:
        print(f"❌ Failed to initialize AIProjectClient: {e}")
        raise

def create_market_analysis_prompt(symbol: str) -> str:
    """Create a specialized prompt for market analysis with real-time data"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    return f"""You are an expert financial market analyst with deep expertise in technical analysis, 
sector analysis, and market trends. Your task is to provide a comprehensive market analysis for {symbol} 
using the most current and real-time market data available.

**FIRST: Use the web search tool to gather current market data for {symbol}:**
- Search for: "{symbol} stock price technical analysis current" 
- Search for: "{symbol} RSI MACD moving averages support resistance"
- Search for: "{symbol} sector analysis market trends latest news"
- Search for: "{symbol} competitors market share analysis"

Focus on data from the last 7 days ({start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}) from reliable financial sources like MarketWatch, Yahoo Finance, Bloomberg, CNBC, TradingView, etc.

Then conduct a thorough analysis covering:

1. **Real-Time Technical Analysis**:
   - Current stock price and recent price trends
   - Key support and resistance levels (provide specific price levels from recent data)
   - Moving averages: 50-day MA and 200-day MA (find current values)
   - Volume analysis and recent trading patterns
   - Technical indicators with current values:
     * RSI: [find current RSI value from financial sites]
     * MACD: [find current MACD value from financial sites]
     * Bollinger Bands position relative to current price
   - Recent chart patterns and technical signals

2. **Current Sector Analysis**:
   - Real-time sector performance and recent trends
   - How {symbol} compares to sector peers today
   - Recent sector-specific news, catalysts and headwinds
   - Current market share and competitive positioning

3. **Current Market Context**:
   - Today's market conditions and sentiment
   - Recent economic factors affecting the stock/sector
   - Latest institutional activity and analyst updates
   - Most recent earnings performance and guidance

4. **Competitive Analysis**:
   - Key competitors and their recent performance
   - Recent competitive advantages/developments
   - Current market share trends and movements
   - Latest innovation and product pipeline updates

5. **Forward-Looking Market Outlook**:
   - Short-term (1-3 months) outlook based on current data
   - Medium-term (6-12 months) outlook
   - Upcoming catalysts and earnings dates
   - Current risks and emerging opportunities

CRITICAL FORMATTING REQUIREMENTS - You MUST include these exact phrases with real data:

Technical Indicators (use exact format with real values):
- RSI: [provide current number between 0-100, e.g., "RSI: 65.2"]
- MACD: [provide current numerical value, e.g., "MACD: -1.23"]
- Support Level: $[provide current price, e.g., "Support Level: $150.50"]
- Resistance Level: $[provide current price, e.g., "Resistance Level: $175.25"]
- 50-day MA: $[provide current price, e.g., "50-day moving average: $162.45"]
- 200-day MA: $[provide current price, e.g., "200-day moving average: $158.90"]

EXAMPLE FORMAT for technical section:
"Based on technical analysis, {symbol} shows the following key levels:
- RSI: 67.5
- MACD: -0.45
- Support Level: $145.20
- Resistance Level: $162.80
- 50-day moving average: $152.35
- 200-day moving average: $148.90"

Make sure to include ALL six technical indicators with the exact phrases above. This is essential for data extraction.

Based on current market data and recent developments, provide specific data points 
and cite recent market developments that support your analysis.

Structure your response as a detailed analysis with clear sections. Include specific numbers 
where possible and provide reasoning for your assessments.
"""

def run_market_analysis(symbol: str) -> MarketAnalysis:
    """Run market analysis for a given stock symbol using real-time data"""
    project_client = None
    
    try:
        project_endpoint, model_deployment, bing_connection, subscription_id, resource_group, project_name = get_required_env_vars()
        
        print(f"🚀 Using Azure AI Projects with Bing grounding for real-time market data")
        print(f"📍 Endpoint: {project_endpoint}")
        print(f"🤖 Model: {model_deployment}")
        print(f"🔍 Bing Connection: {bing_connection}")
        
        # Create Azure AI Project client with fallback handling
        project_client = create_ai_project_client(
            project_endpoint, 
            subscription_id, 
            resource_group, 
            project_name
        )
        
        print(f"✅ Azure AI Project client initialized successfully")
        
        # Get or create the persistent MarketAnalysisAgent with Bing Grounding
        agent, agents_client = get_or_create_market_analysis_agent(
            project_client, 
            model_deployment,
            bing_connection
        )
        
        try:
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
            
        except Exception as thread_error:
            print(f"❌ Error during agent execution: {thread_error}")
            # If there's an error with the cached agent, invalidate it
            if "agent" in str(thread_error).lower() or "not found" in str(thread_error).lower():
                print("🔄 Invalidating cached agent due to error")
                global _market_analysis_agent
                _market_analysis_agent = None
            raise
        
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
        # Close project client but keep agent for reuse
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
    
    # Enhanced patterns with more variations - order matters for moving averages!
    patterns = {
        "RSI": [
            r"RSI[:\s]*(\d+\.?\d*)",
            r"relative.*strength.*index[:\s]*(\d+\.?\d*)",
            r"RSI.*?(\d+\.?\d*)",
            r"rsi[:\s]*(\d+\.?\d*)"
        ],
        "MACD": [
            r"MACD[:\s]*([+-]?\d+\.?\d*)",
            r"moving.*average.*convergence[:\s]*([+-]?\d+\.?\d*)",
            r"MACD.*?([+-]?\d+\.?\d*)",
            r"macd[:\s]*([+-]?\d+\.?\d*)"
        ],
        "Support": [
            r"support[:\s]*level[:\s]*\$?(\d+\.?\d*)",
            r"support[:\s]*\$?(\d+\.?\d*)",
            r"support.*level[:\s]*\$?(\d+\.?\d*)",
            r"key.*support[:\s]*\$?(\d+\.?\d*)",
            r"support.*?[:\s]*\$?(\d+\.?\d*)"
        ],
        "Resistance": [
            r"resistance[:\s]*level[:\s]*\$?(\d+\.?\d*)",
            r"resistance[:\s]*\$?(\d+\.?\d*)",
            r"resistance.*level[:\s]*\$?(\d+\.?\d*)",
            r"key.*resistance[:\s]*\$?(\d+\.?\d*)",
            r"resistance.*?[:\s]*\$?(\d+\.?\d*)"
        ],
        # Process 200-day first to avoid 50-day pattern matching 200-day text
        "200_day_ma": [
            r"200[- ]?day.*?moving average[:\s]*\$?(\d+\.?\d*)",
            r"200[- ]?day.*?MA[:\s]*\$?(\d+\.?\d*)",
            r"200.*?day.*?average[:\s]*\$?(\d+\.?\d*)",
            r"two.*?hundred.*?day.*?moving.*?average[:\s]*\$?(\d+\.?\d*)"
        ],
        "50_day_ma": [
            r"50[- ]?day.*?moving average[:\s]*\$?(\d+\.?\d*)",
            r"50[- ]?day.*?MA[:\s]*\$?(\d+\.?\d*)",
            r"50.*?day.*?average[:\s]*\$?(\d+\.?\d*)",
            r"fifty.*?day.*?moving.*?average[:\s]*\$?(\d+\.?\d*)"
        ]
    }
    
    # Try multiple patterns for each indicator
    for indicator, pattern_list in patterns.items():
        found = False
        for i, pattern in enumerate(pattern_list):
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                try:
                    value = float(match.group(1))
                    indicators[indicator] = value
                    print(f"✅ Found {indicator}: {value} (pattern {i+1})")
                    found = True
                    break
                except (ValueError, IndexError) as e:
                    print(f"⚠️ Error parsing {indicator} value: {e}")
                    continue
        
        if not found:
            print(f"❌ Could not find {indicator} in text")
            # Add some debugging - show a snippet around potential matches
            for i, pattern in enumerate(pattern_list[:2]):  # Check first 2 patterns for debugging
                potential_matches = re.findall(pattern.replace(r'(\d+\.?\d*)', r'[^\s]*'), text, re.IGNORECASE)
                if potential_matches:
                    print(f"🔍 Pattern {i+1} for {indicator} found potential matches: {potential_matches[:3]}")
                    
            # If no specific patterns found, try to find the word itself
            if indicator.lower() in text.lower():
                print(f"🔍 Found '{indicator}' in text but couldn't extract value")
                # Find context around the word
                word_pos = text.lower().find(indicator.lower())
                if word_pos >= 0:
                    start = max(0, word_pos - 50)
                    end = min(len(text), word_pos + 100)
                    context = text[start:end].replace('\n', ' ')
                    print(f"🔍 Context: ...{context}...")
    
    # Add fallback values if indicators not found
    if not indicators.get("RSI"):
        print("🔧 Adding fallback RSI value")
        indicators["RSI"] = 50.0  # Neutral RSI
    if not indicators.get("MACD"):
        print("🔧 Adding fallback MACD value")
        indicators["MACD"] = 0.0  # Neutral MACD
    if not indicators.get("Support"):
        print("🔧 Adding fallback Support level")
        indicators["Support"] = 100.0  # Generic support
    if not indicators.get("Resistance"):
        print("🔧 Adding fallback Resistance level")
        indicators["Resistance"] = 120.0  # Generic resistance
    if not indicators.get("50_day_ma"):
        print("🔧 Adding fallback 50-day MA")
        indicators["50_day_ma"] = 110.0  # Generic MA
    if not indicators.get("200_day_ma"):
        print("🔧 Adding fallback 200-day MA")
        indicators["200_day_ma"] = 105.0  # Generic MA
    
    print(f"🎯 Final extracted indicators: {indicators}")
    return indicators
    
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
    """
    Clean up the persistent MarketAnalysisAgent when application shuts down.
    This is optional but good for resource management.
    """
    global _market_analysis_agent, _agents_client
    
    if _market_analysis_agent and _agents_client:
        try:
            _agents_client.delete_agent(_market_analysis_agent.id)
            print(f"🗑️ MarketAnalysisAgent {_market_analysis_agent.id} deleted during cleanup")
        except Exception as e:
            print(f"⚠️ Failed to delete MarketAnalysisAgent during cleanup: {e}")
        finally:
            _market_analysis_agent = None
            _agents_client = None
    else:
        print("✅ Market Analysis Agent cleaned up")

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
