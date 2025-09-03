"""
Sentiment Analysis Agent using Azure AI Text Analytics and Azure AI Foundry
Provides comprehensive sentiment analysis for stocks including news sentiment,
social media sentiment, analyst sentiment, and overall market sentiment.
"""

import os
import json
import re
from typing import List, Dict, Optional
from azure.ai.projects import AIProjectClient
from azure.ai.agents.models import MessageRole, BingGroundingTool
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Azure Text Analytics (if available)
try:
    from azure.ai.textanalytics import TextAnalyticsClient
    TEXT_ANALYTICS_AVAILABLE = True
except ImportError:
    TEXT_ANALYTICS_AVAILABLE = False
    print("⚠️ Azure Text Analytics SDK not available. Using AI agent for sentiment analysis.")

# Thread pool executor for async operations
executor = ThreadPoolExecutor(max_workers=4)

# Global agent cache
_sentiment_analysis_agent = None
_agents_client = None
_text_analytics_client = None

class SentimentAnalysis:
    def __init__(self, symbol: str, overall_sentiment: str, sentiment_score: float,
                 news_sentiment: Dict, social_sentiment: Dict, analyst_sentiment: Dict, 
                 sentiment_drivers: List[str], sentiment_summary: str):
        self.symbol = symbol
        self.overall_sentiment = overall_sentiment
        self.sentiment_score = sentiment_score
        self.news_sentiment = news_sentiment
        self.social_sentiment = social_sentiment
        self.analyst_sentiment = analyst_sentiment
        self.sentiment_drivers = sentiment_drivers
        self.sentiment_summary = sentiment_summary
        self.generated_at = datetime.now().isoformat()
    
    def to_dict(self):
        return {
            "symbol": self.symbol,
            "overall_sentiment": self.overall_sentiment,
            "sentiment_score": self.sentiment_score,
            "news_sentiment": self.news_sentiment,
            "social_sentiment": self.social_sentiment,
            "analyst_sentiment": self.analyst_sentiment,
            "sentiment_drivers": self.sentiment_drivers,
            "sentiment_summary": self.sentiment_summary,
            "generated_at": self.generated_at
        }

def get_required_env_vars():
    """Get required environment variables for Azure services"""
    project_endpoint = os.getenv("PROJECT_ENDPOINT") or os.getenv("AZURE_AI_FOUNDRY_ENDPOINT")
    model_deployment = os.getenv("MODEL_DEPLOYMENT_NAME") or os.getenv("AZURE_OPENAI_DEPLOYMENT") or "gpt-4o-mini"
    bing_connection = os.getenv("BING_CONNECTION_NAME") or os.getenv("BING_GROUNDING_CONNECTION_ID")
    
    # Text Analytics credentials (optional)
    text_analytics_endpoint = os.getenv("AZURE_TEXT_ANALYTICS_ENDPOINT")
    text_analytics_key = os.getenv("AZURE_TEXT_ANALYTICS_KEY")
    
    subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
    resource_group = os.getenv("AZURE_RESOURCE_GROUP_NAME") 
    project_name = os.getenv("AZURE_PROJECT_NAME")
    
    if not project_endpoint:
        raise ValueError("PROJECT_ENDPOINT or AZURE_AI_FOUNDRY_ENDPOINT environment variable is required")
    if not bing_connection:
        raise ValueError("BING_CONNECTION_NAME or BING_GROUNDING_CONNECTION_ID environment variable is required")
    
    return (project_endpoint, model_deployment, bing_connection, 
            text_analytics_endpoint, text_analytics_key,
            subscription_id, resource_group, project_name)

def create_ai_project_client(project_endpoint, subscription_id=None, resource_group=None, project_name=None):
    """Create AIProjectClient with DefaultAzureCredential authentication"""
    credential = DefaultAzureCredential()
    
    if subscription_id and resource_group and project_name:
        try:
            return AIProjectClient(
                endpoint=project_endpoint,
                credential=credential,
                subscription_id=subscription_id,
                resource_group_name=resource_group,
                project_name=project_name
            )
        except Exception as e:
            print(f"⚠️ Failed to initialize with full parameters: {e}")
    
    try:
        return AIProjectClient(
            endpoint=project_endpoint,
            credential=credential,
        )
    except Exception as e:
        print(f"❌ Failed to initialize AIProjectClient: {e}")
        raise

def create_text_analytics_client(endpoint: str, key: str):
    """Create Text Analytics client if credentials are available"""
    if not TEXT_ANALYTICS_AVAILABLE or not endpoint or not key:
        return None
    
    try:
        from azure.core.credentials import AzureKeyCredential
        credential = AzureKeyCredential(key)
        return TextAnalyticsClient(endpoint=endpoint, credential=credential)
    except Exception as e:
        print(f"⚠️ Failed to initialize Text Analytics client: {e}")
        return None

def create_sentiment_analysis_prompt(symbol: str) -> str:
    """Create a specialized prompt for sentiment analysis"""
    return f"""You are an expert financial sentiment analyst with expertise in analyzing market sentiment, 
news sentiment, social media trends, and analyst opinions. Your task is to provide a comprehensive 
sentiment analysis for {symbol}.

Please conduct a thorough sentiment analysis covering:

1. **News Sentiment Analysis**:
   - Analyze recent news articles (last 30 days) about {symbol}
   - Identify positive, negative, and neutral sentiment trends
   - Key sentiment drivers from news coverage
   - Major events impacting sentiment

2. **Social Media & Retail Sentiment**:
   - Social media sentiment trends (Twitter, Reddit, financial forums)
   - Retail investor sentiment indicators
   - Trending discussions and opinions
   - Sentiment momentum changes

3. **Analyst Sentiment**:
   - Recent analyst ratings and recommendation changes
   - Price target revisions and sentiment
   - Institutional investor sentiment
   - Earnings sentiment and revisions

4. **Market Sentiment Indicators**:
   - Options sentiment (put/call ratios if available)
   - Insider trading activity sentiment
   - Short interest and sentiment implications
   - Volume and price action sentiment signals

5. **Overall Sentiment Assessment**:
   - Aggregate sentiment score (1-10 scale)
   - Sentiment classification (Very Bearish, Bearish, Neutral, Bullish, Very Bullish)
   - Key sentiment drivers and catalysts
   - Sentiment outlook and potential changes

Use web search to gather the most current sentiment data from various sources including:
- Financial news websites
- Social media platforms
- Analyst reports and recommendations
- Market data providers

Provide specific examples and data points to support your sentiment analysis. 
Structure your response with clear sections and assign numerical sentiment scores where possible.
"""

def initialize_sentiment_analysis_agent():
    """Initialize the sentiment analysis agent if not already created"""
    global _sentiment_analysis_agent, _agents_client, _text_analytics_client
    
    if _sentiment_analysis_agent is not None:
        return _sentiment_analysis_agent
    
    try:
        (project_endpoint, model_deployment, bing_connection, 
         text_analytics_endpoint, text_analytics_key,
         subscription_id, resource_group, project_name) = get_required_env_vars()
        
        # Create the AI Project Client
        client = create_ai_project_client(project_endpoint, subscription_id, resource_group, project_name)
        _agents_client = client.agents
        
        # Create Text Analytics client if available
        _text_analytics_client = create_text_analytics_client(text_analytics_endpoint, text_analytics_key)
        
        # Create the Sentiment Analysis Agent with Bing grounding tool
        agent = _agents_client.create_agent(
            model=model_deployment,
            name="SentimentAnalysisAgent",
            instructions="""You are an expert financial sentiment analyst specializing in comprehensive sentiment analysis.
            You analyze news sentiment, social media sentiment, analyst opinions, and market sentiment indicators.
            Always use the web search tool to gather the most current sentiment data from various sources.
            Provide numerical sentiment scores and clear reasoning for your assessments.
            Present findings in a structured format with specific data points and sentiment drivers.""",
            tools=[BingGroundingTool(connection_id=bing_connection)]
        )
        
        _sentiment_analysis_agent = agent
        print(f"✅ Sentiment Analysis Agent initialized successfully: {agent.id}")
        return agent
        
    except Exception as e:
        print(f"❌ Failed to initialize Sentiment Analysis Agent: {e}")
        raise

def run_sentiment_analysis(symbol: str) -> SentimentAnalysis:
    """Run sentiment analysis for a given stock symbol"""
    try:
        agent = initialize_sentiment_analysis_agent()
        
        # Create a thread for this analysis session
        thread = _agents_client.create_thread()
        
        # Create the analysis prompt
        prompt = create_sentiment_analysis_prompt(symbol)
        
        # Add message to thread
        message = _agents_client.create_message(
            thread_id=thread.id,
            role=MessageRole.USER,
            content=prompt
        )
        
        # Run the agent
        run = _agents_client.create_and_process_run(
            thread_id=thread.id,
            assistant_id=agent.id
        )
        
        # Get messages from the thread
        messages = _agents_client.list_messages(thread_id=thread.id)
        
        # Find the assistant's response
        analysis_text = ""
        for message in messages.data:
            if message.role == MessageRole.ASSISTANT:
                for content in message.content:
                    if hasattr(content, 'text'):
                        analysis_text = content.text.value
                        break
                break
        
        # Parse the analysis into structured format
        parsed_analysis = parse_sentiment_analysis(analysis_text, symbol)
        
        # Clean up the thread
        _agents_client.delete_thread(thread.id)
        
        return parsed_analysis
        
    except Exception as e:
        print(f"❌ Error running sentiment analysis for {symbol}: {e}")
        raise

def parse_sentiment_analysis(analysis_text: str, symbol: str) -> SentimentAnalysis:
    """Parse the sentiment analysis text into structured format"""
    try:
        # Extract overall sentiment and score
        overall_sentiment = extract_overall_sentiment(analysis_text)
        sentiment_score = extract_sentiment_score(analysis_text)
        
        # Extract different sentiment categories
        news_sentiment = extract_sentiment_section(analysis_text, "News Sentiment")
        social_sentiment = extract_sentiment_section(analysis_text, "Social Media")
        analyst_sentiment = extract_sentiment_section(analysis_text, "Analyst Sentiment")
        
        # Extract sentiment drivers
        sentiment_drivers = extract_sentiment_drivers(analysis_text)
        
        # Extract summary
        sentiment_summary = extract_section(analysis_text, "Overall Sentiment Assessment", "")
        
        return SentimentAnalysis(
            symbol=symbol,
            overall_sentiment=overall_sentiment,
            sentiment_score=sentiment_score,
            news_sentiment=news_sentiment,
            social_sentiment=social_sentiment,
            analyst_sentiment=analyst_sentiment,
            sentiment_drivers=sentiment_drivers,
            sentiment_summary=sentiment_summary
        )
        
    except Exception as e:
        print(f"⚠️ Error parsing sentiment analysis: {e}")
        # Return basic structure if parsing fails
        return SentimentAnalysis(
            symbol=symbol,
            overall_sentiment="Neutral",
            sentiment_score=5.0,
            news_sentiment={},
            social_sentiment={},
            analyst_sentiment={},
            sentiment_drivers=[],
            sentiment_summary=analysis_text
        )

def extract_overall_sentiment(text: str) -> str:
    """Extract overall sentiment classification"""
    sentiment_patterns = [
        (r"very bullish", "Very Bullish"),
        (r"bullish", "Bullish"),
        (r"very bearish", "Very Bearish"),
        (r"bearish", "Bearish"),
        (r"neutral", "Neutral"),
        (r"positive", "Bullish"),
        (r"negative", "Bearish")
    ]
    
    text_lower = text.lower()
    for pattern, sentiment in sentiment_patterns:
        if re.search(pattern, text_lower):
            return sentiment
    
    return "Neutral"

def extract_sentiment_score(text: str) -> float:
    """Extract numerical sentiment score"""
    # Look for score patterns like "7.5/10", "score: 8", "8 out of 10"
    patterns = [
        r"(\d+\.?\d*)\s*/\s*10",
        r"score[:\s]*(\d+\.?\d*)",
        r"(\d+\.?\d*)\s*out of 10",
        r"rating[:\s]*(\d+\.?\d*)"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                score = float(match.group(1))
                return min(max(score, 0), 10)  # Ensure score is between 0-10
            except ValueError:
                continue
    
    # Default neutral score
    return 5.0

def extract_sentiment_section(text: str, section_name: str) -> Dict:
    """Extract sentiment information for a specific section"""
    section_text = extract_section(text, section_name, "")
    
    sentiment_info = {
        "sentiment": extract_overall_sentiment(section_text),
        "score": extract_sentiment_score(section_text),
        "summary": section_text[:500] if section_text else ""
    }
    
    return sentiment_info

def extract_sentiment_drivers(text: str) -> List[str]:
    """Extract key sentiment drivers from the analysis"""
    drivers = []
    
    # Look for bullet points or numbered lists
    bullet_patterns = [
        r"[•\-\*]\s*(.+?)(?=\n|$)",
        r"\d+\.\s*(.+?)(?=\n|$)",
        r"Key drivers?[:\s]*(.+?)(?=\n\n|$)"
    ]
    
    for pattern in bullet_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            if len(match.strip()) > 10:  # Filter out very short matches
                drivers.append(match.strip())
    
    return drivers[:10]  # Limit to top 10 drivers

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

async def get_sentiment_analysis_async(symbol: str) -> SentimentAnalysis:
    """Async wrapper for sentiment analysis"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, run_sentiment_analysis, symbol)

def cleanup_sentiment_analysis_agent():
    """Clean up the sentiment analysis agent resources"""
    global _sentiment_analysis_agent, _agents_client, _text_analytics_client
    
    try:
        if _sentiment_analysis_agent and _agents_client:
            _agents_client.delete_agent(_sentiment_analysis_agent.id)
            print("✅ Sentiment Analysis Agent cleaned up")
    except Exception as e:
        print(f"⚠️ Error cleaning up Sentiment Analysis Agent: {e}")
    finally:
        _sentiment_analysis_agent = None
        _agents_client = None
        _text_analytics_client = None

# For testing
if __name__ == "__main__":
    import asyncio
    
    async def test():
        try:
            analysis = await get_sentiment_analysis_async("AAPL")
            print("Sentiment Analysis Result:")
            print(json.dumps(analysis.to_dict(), indent=2))
        except Exception as e:
            print(f"Test failed: {e}")
    
    asyncio.run(test())
