"""
Sentiment Analysis Agent using Azure OpenAI
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

Provide specific examples and assign numerical sentiment scores where possible. 
Structure your response with clear sections and provide reasoning for your assessments.
"""

def run_sentiment_analysis(symbol: str) -> SentimentAnalysis:
    """Run sentiment analysis for a given stock symbol"""
    try:
        client = create_openai_client()
        project_endpoint, api_key, model_deployment = get_required_env_vars()
        
        # Create the analysis prompt
        prompt = create_sentiment_analysis_prompt(symbol)
        
        # Call Azure OpenAI
        response = client.chat.completions.create(
            model=model_deployment,
            messages=[
                {"role": "system", "content": "You are an expert financial sentiment analyst."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=3000,
            temperature=0.7
        )
        
        analysis_text = response.choices[0].message.content
        
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
            sentiment_summary=f"Sentiment analysis for {symbol} is currently unavailable due to technical issues. Please try again later."
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
    global _openai_client
    
    try:
        _openai_client = None
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
