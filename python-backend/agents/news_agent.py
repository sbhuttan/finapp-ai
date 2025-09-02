"""
News Agent using Azure AI Foundry with Bing Grounding Tool
Adapted from news_bing_grounding.py for financial news retrieval
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

# Thread pool executor for async operations
executor = ThreadPoolExecutor(max_workers=4)

class NewsItem:
    def __init__(self, id: str, source: str, headline: str, url: str, published_at: str, summary: str = None):
        self.id = id
        self.source = source
        self.headline = headline
        self.url = url
        self.published_at = published_at
        self.summary = summary
    
    def to_dict(self):
        return {
            "id": self.id,
            "source": self.source,
            "headline": self.headline,
            "url": self.url,
            "publishedAt": self.published_at,
            "summary": self.summary
        }

def get_required_env_vars():
    """Get required environment variables for Azure AI Foundry"""
    project_endpoint = os.getenv("PROJECT_ENDPOINT") or os.getenv("AZURE_AI_FOUNDRY_ENDPOINT")
    model_deployment = os.getenv("MODEL_DEPLOYMENT_NAME") or os.getenv("AZURE_OPENAI_DEPLOYMENT") or "gpt-4o-mini"
    bing_connection = os.getenv("BING_CONNECTION_NAME") or os.getenv("BING_GROUNDING_CONNECTION_ID")
    
    # Additional parameters that might be needed for newer SDK versions
    subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
    resource_group = os.getenv("AZURE_RESOURCE_GROUP_NAME") 
    project_name = os.getenv("AZURE_PROJECT_NAME")
    
    if not project_endpoint:
        raise ValueError("PROJECT_ENDPOINT or AZURE_AI_FOUNDRY_ENDPOINT environment variable is required")
    if not bing_connection:
        raise ValueError("BING_CONNECTION_NAME or BING_GROUNDING_CONNECTION_ID environment variable is required")
    
    return project_endpoint, model_deployment, bing_connection, subscription_id, resource_group, project_name

def create_ai_project_client(project_endpoint, subscription_id=None, resource_group=None, project_name=None):
    """Create AIProjectClient with DefaultAzureCredential authentication"""
    credential = DefaultAzureCredential()
    
    # Try the newer initialization pattern first
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
    
    # Fallback to the original pattern
    try:
        return AIProjectClient(
            endpoint=project_endpoint,
            credential=credential,
        )
    except Exception as e:
        print(f"❌ Failed to initialize AIProjectClient: {e}")
        raise

def create_financial_news_prompt(symbol: str, limit: int, lookback_days: int) -> str:
    """Create a specialized prompt for financial news gathering"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=lookback_days)
    
    return f"""You are a factual financial news researcher. Your task is to:

1. Use the web search tool to find the most recent, relevant news articles about {symbol} stock and company
2. Search for news published between {start_date.strftime('%Y-%m-%d')} and {end_date.strftime('%Y-%m-%d')} (last {lookback_days} days)
3. Focus on reputable financial and news sources (Reuters, Bloomberg, CNBC, MarketWatch, Yahoo Finance, Associated Press, etc.)
4. Prioritize news that impacts stock price, earnings, company developments, or market sentiment
5. Avoid duplicate stories and paywalled content when possible

Search for: "{symbol} stock news earnings financial results market" AND "recent {symbol} company news developments"

You MUST return your response as a strict JSON array with exactly {limit} items (or fewer if not enough recent news exists). Each item must have this exact structure:

```json
[
  {{
    "id": "unique_identifier_string",
    "source": "news_source_name",
    "headline": "actual_headline_from_article", 
    "url": "actual_article_url",
    "publishedAt": "ISO_8601_datetime_from_article",
    "summary": "brief_factual_summary_of_key_points"
  }}
]
```

Return ONLY the JSON array, no additional text, explanations, or formatting. Make sure all URLs are real and working."""

def extract_json_from_response(response_text: str) -> Optional[List[Dict]]:
    """Extract JSON array from agent response"""
    try:
        # First, try to parse the entire response as JSON
        return json.loads(response_text.strip())
    except json.JSONDecodeError:
        # If that fails, try to find JSON within the text
        json_pattern = r'```json\s*(.*?)\s*```|```\s*(.*?)\s*```|\[.*?\]'
        matches = re.findall(json_pattern, response_text, re.DOTALL)
        
        for match in matches:
            # Try each captured group
            for group in match:
                if group.strip():
                    try:
                        return json.loads(group.strip())
                    except json.JSONDecodeError:
                        continue
        
        # Last resort: look for array-like structure
        array_pattern = r'\[(?:[^[\]]|(?:\[[^[\]]*\]))*\]'
        array_matches = re.findall(array_pattern, response_text, re.DOTALL)
        
        for array_match in array_matches:
            try:
                return json.loads(array_match)
            except json.JSONDecodeError:
                continue
                
        return None

def _run_bing_grounding_sync(symbol: str, limit: int, lookback_days: int) -> List[NewsItem]:
    """Synchronous function to run the Bing grounding agent"""
    try:
        # Get environment variables
        project_endpoint, model_deployment, bing_connection, subscription_id, resource_group, project_name = get_required_env_vars()
        
        print(f"🚀 Using Azure AI Foundry with Bing grounding")
        print(f"📍 Endpoint: {project_endpoint}")
        print(f"🤖 Model: {model_deployment}")
        print(f"🔍 Bing Connection: {bing_connection}")
        
        # Create project client with fallback handling
        project_client = create_ai_project_client(
            project_endpoint, 
            subscription_id, 
            resource_group, 
            project_name
        )
        
        with project_client:
            agents_client = project_client.agents
            
            # Use connection ID directly instead of looking it up
            # The bing_connection should be the actual connection ID, not a name to lookup
            # [START create_agent_with_bing_grounding_tool]
            conn_id = project_client.connections.get(os.environ["BING_CONNECTION_NAME"]).id
            print(f"✅ Using Bing connection ID: {conn_id}")
            
            # Initialize Bing grounding tool
            bing_tool = BingGroundingTool(connection_id=conn_id)
            
            # Create agent with financial news specialization
            agent_name = f"FinancialNewsAgent_{symbol}_{int(datetime.now().timestamp())}"
            agent = agents_client.create_agent(
                model=model_deployment,
                name=agent_name,
                instructions="You are a specialized financial news researcher that provides factual, recent news about stocks and companies using web search.",
                tools=bing_tool.definitions,
            )
            
            print(f"✅ Agent created: {agent.id}")
            
            try:
                # Create thread for communication
                thread = agents_client.threads.create()
                print(f"✅ Thread created: {thread.id}")
                
                # Create the financial news search message
                search_prompt = create_financial_news_prompt(symbol, limit, lookback_days)
                
                message = agents_client.messages.create(
                    thread_id=thread.id,
                    role=MessageRole.USER,
                    content=search_prompt,
                )
                print(f"✅ Message created: {message.id}")
                
                # Run the agent
                print("🔄 Running agent with Bing grounding...")
                run = agents_client.runs.create_and_process(thread_id=thread.id, agent_id=agent.id)
                print(f"✅ Run completed with status: {run.status}")
                
                if run.status == "failed":
                    error_msg = f"Agent run failed: {run.last_error}"
                    print(f"❌ {error_msg}")
                    raise Exception(error_msg)
                
                # Get the agent's response
                response_message = agents_client.messages.get_last_message_by_role(
                    thread_id=thread.id, 
                    role=MessageRole.AGENT
                )
                
                if not response_message:
                    raise Exception("No response message found from agent")
                
                # Extract text from response
                response_text = ""
                if response_message.text_messages:
                    responses = []
                    for text_message in response_message.text_messages:
                        responses.append(text_message.text.value)
                    response_text = " ".join(responses)
                    
                    # Apply URL citations if available
                    for annotation in response_message.url_citation_annotations:
                        response_text = response_text.replace(
                            annotation.text, 
                            f" [{annotation.url_citation.title}]({annotation.url_citation.url})"
                        )
                
                print(f"📝 Agent response: {response_text[:500]}...")
                
                # Parse JSON response
                news_data = extract_json_from_response(response_text)
                
                if not news_data or not isinstance(news_data, list):
                    print("❌ Failed to extract valid JSON from agent response")
                    return []
                
                # Convert to NewsItem objects
                news_items = []
                for item in news_data:
                    if isinstance(item, dict) and all(key in item for key in ['id', 'source', 'headline', 'url', 'publishedAt']):
                        news_item = NewsItem(
                            id=item['id'],
                            source=item['source'],
                            headline=item['headline'],
                            url=item['url'],
                            published_at=item['publishedAt'],
                            summary=item.get('summary')
                        )
                        news_items.append(news_item)
                
                print(f"✅ Successfully parsed {len(news_items)} news items")
                return news_items
                
            finally:
                # Clean up: delete the agent
                try:
                    agents_client.delete_agent(agent.id)
                    print(f"🗑️ Agent {agent.id} deleted")
                except Exception as e:
                    print(f"⚠️ Failed to delete agent: {e}")
    
    except Exception as e:
        print(f"❌ Error in Bing grounding agent: {str(e)}")
        raise

async def get_news_via_bing_grounding(symbol: str, limit: int = 3, lookback_days: int = 7) -> List[Dict]:
    """
    Async wrapper for getting news via Azure AI Foundry Bing grounding agent
    """
    try:
        # Run the synchronous function in a thread pool
        news_items = await asyncio.get_event_loop().run_in_executor(
            executor, 
            _run_bing_grounding_sync, 
            symbol, 
            limit, 
            lookback_days
        )
        
        # Convert to dictionaries for JSON response
        return [item.to_dict() for item in news_items]
        
    except Exception as e:
        print(f"❌ Error in async news agent: {str(e)}")
        # Return empty list on error - let the frontend handle fallbacks
        return []

# For testing
if __name__ == "__main__":
    import asyncio
    
    async def test():
        news = await get_news_via_bing_grounding("AAPL", 3, 7)
        print(f"Got {len(news)} news items:")
        for item in news:
            print(f"- {item['headline']} ({item['source']})")
    
    asyncio.run(test())
