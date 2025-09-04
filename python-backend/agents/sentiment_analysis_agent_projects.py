"""
Sentiment Analysis Agent using Azure AI Projects
Provides comprehensive sentiment analysis for stocks including news sentiment,
social media sentiment, and analyst sentiment.
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

# Global cache for persistent sentiment analysis agent
_sentiment_analysis_agent = None
_agents_client = None

class SentimentData:
    def __init__(self, sentiment: str, score: float, summary: str):
        self.sentiment = sentiment
        self.score = score
        self.summary = summary
    
    def to_dict(self):
        return {
            "sentiment": self.sentiment,
            "score": self.score,
            "summary": self.summary
        }

class SentimentAnalysis:
    def __init__(self, symbol: str, overall_sentiment: str, sentiment_score: float,
                 news_sentiment: SentimentData, social_sentiment: SentimentData,
                 analyst_sentiment: SentimentData, sentiment_drivers: List[str],
                 sentiment_summary: str):
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
            "news_sentiment": self.news_sentiment.to_dict(),
            "social_sentiment": self.social_sentiment.to_dict(),
            "analyst_sentiment": self.analyst_sentiment.to_dict(),
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

def create_sentiment_analysis_prompt(symbol: str) -> str:
    """Create a specialized prompt for sentiment analysis"""
    return f"""You are an expert financial sentiment analyst with expertise in analyzing market sentiment, 
news sentiment, social media trends, and analyst opinions. Your task is to provide a comprehensive 
sentiment analysis for {symbol}.

Please conduct a thorough sentiment analysis covering:

1. **Overall Sentiment Assessment**:
   - Current overall market sentiment towards {symbol}
   - Sentiment score (1-10 scale where 1=Very Bearish, 10=Very Bullish)
   - Sentiment classification (Very Bearish, Bearish, Neutral, Bullish, Very Bullish)

2. **News Sentiment Analysis**:
   - Recent news coverage sentiment
   - Key news themes and their sentiment impact
   - News sentiment score (1-10 scale)
   - Analysis of recent earnings, announcements, and corporate developments

3. **Social Media and Retail Sentiment**:
   - Social media buzz and sentiment trends
   - Retail investor sentiment indicators
   - Social sentiment score (1-10 scale)
   - Discussion volume and engagement metrics

4. **Analyst and Institutional Sentiment**:
   - Professional analyst recommendations and sentiment
   - Institutional investor sentiment indicators
   - Recent rating changes and price target adjustments
   - Analyst sentiment score (1-10 scale)

5. **Sentiment Drivers and Catalysts**:
   - Key factors driving current sentiment
   - Upcoming events that could impact sentiment
   - Sentiment momentum and trend analysis
   - Risk factors for sentiment shifts

6. **Sentiment Outlook**:
   - Short-term sentiment outlook (1-3 months)
   - Medium-term sentiment trends (6-12 months)
   - Potential sentiment catalysts
   - Sentiment stability assessment

Provide specific data points and examples to support your sentiment analysis. 
Structure your response with clear sections and assign numerical sentiment scores where possible.
Focus on recent developments and current market sentiment indicators.
Use a 1-10 sentiment scale where 1=Very Bearish and 10=Very Bullish for all assessments.
"""

def get_or_create_sentiment_analysis_agent():
    """
    Get or create a persistent SentimentAnalysisAgent.
    Reuses existing agent if available, creates new one if needed.
    """
    global _sentiment_analysis_agent, _agents_client
    
    try:
        project_endpoint, model_deployment = get_required_env_vars()
        
        # Initialize clients if not available
        if not _agents_client:
            project_client = AIProjectClient(
                endpoint=project_endpoint,
                credential=DefaultAzureCredential(),
            )
            _agents_client = project_client.agents
            print("✅ Azure AI Project client initialized for SentimentAnalysisAgent")
        
        # Check if agent exists and is valid
        if _sentiment_analysis_agent:
            try:
                # Validate agent still exists
                agent_info = _agents_client.get_agent(_sentiment_analysis_agent.id)
                if agent_info and agent_info.id == _sentiment_analysis_agent.id:
                    print(f"♻️ Reusing existing SentimentAnalysisAgent: {_sentiment_analysis_agent.id}")
                    return _sentiment_analysis_agent, _agents_client
                else:
                    print("⚠️ Cached SentimentAnalysisAgent is invalid, creating new one")
                    _sentiment_analysis_agent = None
            except Exception as e:
                print(f"⚠️ Error validating cached SentimentAnalysisAgent: {e}")
                _sentiment_analysis_agent = None
        
        # Create new agent
        _sentiment_analysis_agent = _agents_client.create_agent(
            model=model_deployment,
            name="SentimentAnalysisAgent",
            instructions="""You are an expert financial sentiment analyst specializing in comprehensive sentiment analysis.
            You analyze news sentiment, social media sentiment, analyst opinions, and market sentiment indicators.
            Always provide numerical sentiment scores and clear reasoning for your assessments.
            Present findings in a structured format with specific data points and sentiment drivers.
            Use a 1-10 scale for all sentiment scores where 1=Very Bearish and 10=Very Bullish.""",
            tools=[],  # No special tools needed for this analysis
        )
        print(f"🆕 Created new SentimentAnalysisAgent: {_sentiment_analysis_agent.id}")
        
        return _sentiment_analysis_agent, _agents_client
        
    except Exception as e:
        print(f"❌ Error creating SentimentAnalysisAgent: {e}")
        raise

def run_sentiment_analysis(symbol: str) -> SentimentAnalysis:
    """Run sentiment analysis for a given stock symbol using persistent agent"""
    try:
        # Get or create persistent agent
        agent, agents_client = get_or_create_sentiment_analysis_agent()
        
        print(f"✅ Using SentimentAnalysisAgent for {symbol} analysis")
        
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
            news_sentiment=SentimentData("Neutral", 5.0, "Analysis unavailable"),
            social_sentiment=SentimentData("Neutral", 5.0, "Analysis unavailable"),
            analyst_sentiment=SentimentData("Neutral", 5.0, "Analysis unavailable"),
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
        analyst_sentiment = extract_sentiment_section(analysis_text, "Analyst")
        
        # Extract sentiment drivers
        sentiment_drivers = extract_sentiment_drivers(analysis_text)
        
        # Extract summary
        sentiment_summary = extract_section(analysis_text, "Sentiment Outlook", "")
        
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
            news_sentiment=SentimentData("Neutral", 5.0, ""),
            social_sentiment=SentimentData("Neutral", 5.0, ""),
            analyst_sentiment=SentimentData("Neutral", 5.0, ""),
            sentiment_drivers=[],
            sentiment_summary=analysis_text
        )

def extract_overall_sentiment(text: str) -> str:
    """Extract overall sentiment classification"""
    sentiment_patterns = [
        (r"very bullish", "Very Bullish"),
        (r"bullish", "Bullish"),
        (r"bearish", "Bearish"),
        (r"very bearish", "Very Bearish"),
        (r"neutral", "Neutral")
    ]
    
    text_lower = text.lower()
    for pattern, sentiment in sentiment_patterns:
        if re.search(pattern, text_lower):
            return sentiment
    
    return "Neutral"

def extract_sentiment_score(text: str) -> float:
    """Extract numerical sentiment score"""
    # Look for score patterns like "7.5/10", "sentiment score: 8", "8 out of 10"
    patterns = [
        r"sentiment\s*score[:\s]*(\d+\.?\d*)",
        r"(\d+\.?\d*)\s*/\s*10",
        r"(\d+\.?\d*)\s*out of 10",
        r"overall[:\s]*(\d+\.?\d*)"
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

def extract_sentiment_section(text: str, section_name: str) -> SentimentData:
    """Extract sentiment information for a specific section"""
    section_text = extract_section(text, section_name, "")
    
    sentiment = extract_overall_sentiment(section_text)
    score = extract_sentiment_score(section_text)
    summary = section_text[:300] if section_text else "Analysis unavailable"
    
    return SentimentData(sentiment, score, summary)

def extract_sentiment_drivers(text: str) -> List[str]:
    """Extract sentiment drivers from the analysis"""
    drivers = []
    
    # Look for drivers section
    drivers_text = extract_section(text, "Sentiment Drivers", "Sentiment Outlook")
    if not drivers_text:
        drivers_text = extract_section(text, "Catalysts", "")
    
    # Extract bullet points or numbered lists
    bullet_patterns = [
        r"[•\-\*]\s*(.+?)(?=\n|$)",
        r"\d+\.\s*(.+?)(?=\n|$)"
    ]
    
    for pattern in bullet_patterns:
        matches = re.findall(pattern, drivers_text, re.MULTILINE)
        for match in matches:
            if len(match.strip()) > 10:  # Filter out very short matches
                drivers.append(match.strip())
    
    return drivers[:8]  # Limit to top 8 drivers

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
    """
    Clean up the persistent SentimentAnalysisAgent when application shuts down.
    This is optional but good for resource management.
    """
    global _sentiment_analysis_agent, _agents_client
    
    if _sentiment_analysis_agent and _agents_client:
        try:
            _agents_client.delete_agent(_sentiment_analysis_agent.id)
            print(f"🗑️ SentimentAnalysisAgent {_sentiment_analysis_agent.id} deleted during cleanup")
        except Exception as e:
            print(f"⚠️ Failed to delete SentimentAnalysisAgent during cleanup: {e}")
        finally:
            _sentiment_analysis_agent = None
            _agents_client = None
    else:
        print("✅ Sentiment Analysis Agent cleaned up")

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
