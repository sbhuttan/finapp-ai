"""
Sentiment Analysis Agent using Azure AI Projects
Provides comprehensive sentiment analysis for stocks including news sentiment,
social media sentiment, analyst sentiment, and overall market sentiment.
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
   - Aggregate sentiment score (1-10 scale, where 1=Very Bearish, 10=Very Bullish)
   - Sentiment classification (Very Bearish, Bearish, Neutral, Bullish, Very Bullish)
   - Key sentiment drivers and catalysts
   - Sentiment outlook and potential changes

Provide specific examples and assign numerical sentiment scores where possible. 
Structure your response with clear sections and provide reasoning for your assessments.
Include specific sentiment scores for each category and an overall assessment.
"""

def run_sentiment_analysis(symbol: str) -> SentimentAnalysis:
    """Run sentiment analysis for a given stock symbol"""
    try:
        project_client, agents_client = create_project_client()
        project_endpoint, model_deployment = get_required_env_vars()
        
        with project_client:
            # Create agent for sentiment analysis
            agent = agents_client.create_agent(
                model=model_deployment,
                name=f"sentiment-analyst-{symbol}",
                instructions="""You are an expert financial sentiment analyst specializing in comprehensive sentiment analysis.
                You analyze news sentiment, social media sentiment, analyst opinions, and market sentiment indicators.
                Always provide numerical sentiment scores and clear reasoning for your assessments.
                Present findings in a structured format with specific data points and sentiment drivers.
                Use a 1-10 scale for all sentiment scores where 1=Very Bearish and 10=Very Bullish.""",
                tools=[],  # No special tools needed for this analysis
            )
            
            print(f"Created sentiment analysis agent, ID: {agent.id}")
            
            # Create thread for communication
            thread = agents_client.threads.create()
            print(f"Created thread, ID: {thread.id}")
            
            # Create the analysis prompt
            prompt = create_sentiment_analysis_prompt(symbol)
            
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
            print(f"Sentiment analysis run finished with status: {run.status}")
            
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
            print("Deleted sentiment analysis agent")
            
            # Parse the analysis into structured format
            parsed_analysis = parse_sentiment_analysis(analysis_text, symbol)
            
            return parsed_analysis
        
    except Exception as e:
        print(f"❌ Error running sentiment analysis for {symbol}: {e}")
        # Return a fallback analysis
        return SentimentAnalysis(
            symbol=symbol,
            overall_sentiment="Neutral",
            sentiment_score=5.0,
            news_sentiment={"sentiment": "Neutral", "score": 5.0, "summary": "Analysis unavailable"},
            social_sentiment={"sentiment": "Neutral", "score": 5.0, "summary": "Analysis unavailable"},
            analyst_sentiment={"sentiment": "Neutral", "score": 5.0, "summary": "Analysis unavailable"},
            sentiment_drivers=[],
            sentiment_summary=f"Sentiment analysis for {symbol} is currently unavailable due to technical issues: {str(e)}. Please try again later."
        )

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
            sentiment_summary=sentiment_summary or analysis_text
        )
        
    except Exception as e:
        print(f"⚠️ Error parsing sentiment analysis: {e}")
        # Return basic structure if parsing fails
        return SentimentAnalysis(
            symbol=symbol,
            overall_sentiment="Neutral",
            sentiment_score=5.0,
            news_sentiment={"sentiment": "Neutral", "score": 5.0, "summary": ""},
            social_sentiment={"sentiment": "Neutral", "score": 5.0, "summary": ""},
            analyst_sentiment={"sentiment": "Neutral", "score": 5.0, "summary": ""},
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
    global _project_client, _agents_client
    
    try:
        _project_client = None
        _agents_client = None
        print("✅ Sentiment Analysis Agent cleaned up")
    except Exception as e:
        print(f"⚠️ Error cleaning up Sentiment Analysis Agent: {e}")

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
