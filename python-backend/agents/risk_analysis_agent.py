"""
Risk Analysis Agent using Azure AI Foundry
Provides comprehensive risk analysis for stocks including financial risks,
market risks, operational risks, and regulatory risks.
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

# Global agent cache
_risk_analysis_agent = None
_agents_client = None

class RiskAnalysis:
    def __init__(self, symbol: str, overall_risk_rating: str, risk_score: float,
                 financial_risks: Dict, market_risks: Dict, operational_risks: Dict,
                 regulatory_risks: Dict, risk_factors: List[str], risk_mitigation: List[str],
                 risk_summary: str):
        self.symbol = symbol
        self.overall_risk_rating = overall_risk_rating
        self.risk_score = risk_score
        self.financial_risks = financial_risks
        self.market_risks = market_risks
        self.operational_risks = operational_risks
        self.regulatory_risks = regulatory_risks
        self.risk_factors = risk_factors
        self.risk_mitigation = risk_mitigation
        self.risk_summary = risk_summary
        self.generated_at = datetime.now().isoformat()
    
    def to_dict(self):
        return {
            "symbol": self.symbol,
            "overall_risk_rating": self.overall_risk_rating,
            "risk_score": self.risk_score,
            "financial_risks": self.financial_risks,
            "market_risks": self.market_risks,
            "operational_risks": self.operational_risks,
            "regulatory_risks": self.regulatory_risks,
            "risk_factors": self.risk_factors,
            "risk_mitigation": self.risk_mitigation,
            "risk_summary": self.risk_summary,
            "generated_at": self.generated_at
        }

def get_required_env_vars():
    """Get required environment variables for Azure AI Foundry"""
    project_endpoint = os.getenv("PROJECT_ENDPOINT") or os.getenv("AZURE_AI_FOUNDRY_ENDPOINT")
    model_deployment = os.getenv("MODEL_DEPLOYMENT_NAME") or os.getenv("AZURE_OPENAI_DEPLOYMENT") or "gpt-4o-mini"
    bing_connection = os.getenv("BING_CONNECTION_NAME") or os.getenv("BING_GROUNDING_CONNECTION_ID")
    
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

def create_risk_analysis_prompt(symbol: str) -> str:
    """Create a specialized prompt for risk analysis"""
    return f"""You are an expert financial risk analyst with deep expertise in identifying, assessing, 
and quantifying various types of investment risks. Your task is to provide a comprehensive risk 
analysis for {symbol}.

Please conduct a thorough risk analysis covering:

1. **Financial Risks**:
   - Credit risk and debt levels
   - Liquidity risk and cash flow analysis
   - Profitability risks and margin pressures
   - Balance sheet risks and leverage ratios
   - Earnings volatility and predictability

2. **Market Risks**:
   - Stock price volatility (beta analysis)
   - Market correlation and systematic risk
   - Sector-specific risks and cyclicality
   - Interest rate sensitivity
   - Currency and foreign exchange risks

3. **Operational Risks**:
   - Business model risks and competitive threats
   - Supply chain vulnerabilities
   - Technology and cybersecurity risks
   - Key person/management risks
   - Operational efficiency and execution risks

4. **Regulatory and External Risks**:
   - Regulatory compliance and legal risks
   - Environmental, social, and governance (ESG) risks
   - Political and geopolitical risks
   - Industry regulation changes
   - Litigation and legal exposure

5. **Risk Assessment and Scoring**:
   - Overall risk rating (Low, Medium, High, Very High)
   - Risk score (1-10 scale, where 10 is highest risk)
   - Key risk factors ranked by severity and probability
   - Risk trend analysis (improving, stable, deteriorating)
   - Potential impact assessment

6. **Risk Mitigation and Management**:
   - Company's risk management practices
   - Risk mitigation strategies and controls
   - Insurance and hedging strategies
   - Diversification benefits and portfolio considerations

Use web search to gather the most current information about:
- Recent financial reports and risk disclosures
- Industry-specific risk factors and trends
- Regulatory developments and compliance issues
- Recent incidents or risk events
- Analyst risk assessments and ratings

Provide specific data points, ratios, and examples to support your risk analysis. 
Structure your response with clear sections and assign numerical risk scores where possible.
Focus on both quantitative and qualitative risk factors.
"""

def initialize_risk_analysis_agent():
    """Initialize the risk analysis agent if not already created"""
    global _risk_analysis_agent, _agents_client
    
    if _risk_analysis_agent is not None:
        return _risk_analysis_agent
    
    try:
        project_endpoint, model_deployment, bing_connection, subscription_id, resource_group, project_name = get_required_env_vars()
        
        # Create the AI Project Client
        client = create_ai_project_client(project_endpoint, subscription_id, resource_group, project_name)
        _agents_client = client.agents
        
        # Create the Risk Analysis Agent with Bing grounding tool
        agent = _agents_client.create_agent(
            model=model_deployment,
            name="RiskAnalysisAgent",
            instructions="""You are an expert financial risk analyst specializing in comprehensive risk assessment.
            You identify and assess financial risks, market risks, operational risks, and regulatory risks.
            Always use the web search tool to gather the most current risk-related data and information.
            Provide numerical risk scores and clear reasoning for your risk assessments.
            Present findings in a structured format with specific risk factors and mitigation strategies.""",
            tools=[BingGroundingTool(connection_id=bing_connection)]
        )
        
        _risk_analysis_agent = agent
        print(f"✅ Risk Analysis Agent initialized successfully: {agent.id}")
        return agent
        
    except Exception as e:
        print(f"❌ Failed to initialize Risk Analysis Agent: {e}")
        raise

def run_risk_analysis(symbol: str) -> RiskAnalysis:
    """Run risk analysis for a given stock symbol"""
    try:
        agent = initialize_risk_analysis_agent()
        
        # Create a thread for this analysis session
        thread = _agents_client.create_thread()
        
        # Create the analysis prompt
        prompt = create_risk_analysis_prompt(symbol)
        
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
        parsed_analysis = parse_risk_analysis(analysis_text, symbol)
        
        # Clean up the thread
        _agents_client.delete_thread(thread.id)
        
        return parsed_analysis
        
    except Exception as e:
        print(f"❌ Error running risk analysis for {symbol}: {e}")
        raise

def parse_risk_analysis(analysis_text: str, symbol: str) -> RiskAnalysis:
    """Parse the risk analysis text into structured format"""
    try:
        # Extract overall risk rating and score
        overall_risk_rating = extract_risk_rating(analysis_text)
        risk_score = extract_risk_score(analysis_text)
        
        # Extract different risk categories
        financial_risks = extract_risk_section(analysis_text, "Financial Risks")
        market_risks = extract_risk_section(analysis_text, "Market Risks")
        operational_risks = extract_risk_section(analysis_text, "Operational Risks")
        regulatory_risks = extract_risk_section(analysis_text, "Regulatory")
        
        # Extract risk factors and mitigation
        risk_factors = extract_risk_factors(analysis_text)
        risk_mitigation = extract_risk_mitigation(analysis_text)
        
        # Extract summary
        risk_summary = extract_section(analysis_text, "Risk Assessment", "")
        
        return RiskAnalysis(
            symbol=symbol,
            overall_risk_rating=overall_risk_rating,
            risk_score=risk_score,
            financial_risks=financial_risks,
            market_risks=market_risks,
            operational_risks=operational_risks,
            regulatory_risks=regulatory_risks,
            risk_factors=risk_factors,
            risk_mitigation=risk_mitigation,
            risk_summary=risk_summary
        )
        
    except Exception as e:
        print(f"⚠️ Error parsing risk analysis: {e}")
        # Return basic structure if parsing fails
        return RiskAnalysis(
            symbol=symbol,
            overall_risk_rating="Medium",
            risk_score=5.0,
            financial_risks={},
            market_risks={},
            operational_risks={},
            regulatory_risks={},
            risk_factors=[],
            risk_mitigation=[],
            risk_summary=analysis_text
        )

def extract_risk_rating(text: str) -> str:
    """Extract overall risk rating classification"""
    risk_patterns = [
        (r"very high risk", "Very High"),
        (r"high risk", "High"),
        (r"medium risk", "Medium"),
        (r"moderate risk", "Medium"),
        (r"low risk", "Low"),
        (r"very low risk", "Very Low")
    ]
    
    text_lower = text.lower()
    for pattern, rating in risk_patterns:
        if re.search(pattern, text_lower):
            return rating
    
    return "Medium"

def extract_risk_score(text: str) -> float:
    """Extract numerical risk score"""
    # Look for score patterns like "7.5/10", "risk score: 8", "8 out of 10"
    patterns = [
        r"risk\s*score[:\s]*(\d+\.?\d*)",
        r"(\d+\.?\d*)\s*/\s*10",
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
    
    # Default medium risk score
    return 5.0

def extract_risk_section(text: str, section_name: str) -> Dict:
    """Extract risk information for a specific section"""
    section_text = extract_section(text, section_name, "")
    
    risk_info = {
        "rating": extract_risk_rating(section_text),
        "score": extract_risk_score(section_text),
        "summary": section_text[:500] if section_text else "",
        "key_risks": extract_key_risks_from_section(section_text)
    }
    
    return risk_info

def extract_key_risks_from_section(text: str) -> List[str]:
    """Extract key risks from a section"""
    risks = []
    
    # Look for bullet points or numbered lists
    bullet_patterns = [
        r"[•\-\*]\s*(.+?)(?=\n|$)",
        r"\d+\.\s*(.+?)(?=\n|$)"
    ]
    
    for pattern in bullet_patterns:
        matches = re.findall(pattern, text, re.MULTILINE)
        for match in matches:
            if len(match.strip()) > 15:  # Filter out very short matches
                risks.append(match.strip())
    
    return risks[:5]  # Limit to top 5 risks per section

def extract_risk_factors(text: str) -> List[str]:
    """Extract key risk factors from the analysis"""
    factors = []
    
    # Look for risk factors section
    risk_factors_text = extract_section(text, "Key risk factors", "Risk mitigation")
    if not risk_factors_text:
        risk_factors_text = extract_section(text, "Risk factors", "")
    
    # Extract bullet points or numbered lists
    bullet_patterns = [
        r"[•\-\*]\s*(.+?)(?=\n|$)",
        r"\d+\.\s*(.+?)(?=\n|$)"
    ]
    
    for pattern in bullet_patterns:
        matches = re.findall(pattern, risk_factors_text, re.MULTILINE)
        for match in matches:
            if len(match.strip()) > 10:  # Filter out very short matches
                factors.append(match.strip())
    
    return factors[:10]  # Limit to top 10 risk factors

def extract_risk_mitigation(text: str) -> List[str]:
    """Extract risk mitigation strategies from the analysis"""
    mitigation = []
    
    # Look for mitigation section
    mitigation_text = extract_section(text, "Risk mitigation", "")
    if not mitigation_text:
        mitigation_text = extract_section(text, "Risk Management", "")
    
    # Extract bullet points or numbered lists
    bullet_patterns = [
        r"[•\-\*]\s*(.+?)(?=\n|$)",
        r"\d+\.\s*(.+?)(?=\n|$)"
    ]
    
    for pattern in bullet_patterns:
        matches = re.findall(pattern, mitigation_text, re.MULTILINE)
        for match in matches:
            if len(match.strip()) > 10:  # Filter out very short matches
                mitigation.append(match.strip())
    
    return mitigation[:8]  # Limit to top 8 mitigation strategies

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

async def get_risk_analysis_async(symbol: str) -> RiskAnalysis:
    """Async wrapper for risk analysis"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, run_risk_analysis, symbol)

def cleanup_risk_analysis_agent():
    """Clean up the risk analysis agent resources"""
    global _risk_analysis_agent, _agents_client
    
    try:
        if _risk_analysis_agent and _agents_client:
            _agents_client.delete_agent(_risk_analysis_agent.id)
            print("✅ Risk Analysis Agent cleaned up")
    except Exception as e:
        print(f"⚠️ Error cleaning up Risk Analysis Agent: {e}")
    finally:
        _risk_analysis_agent = None
        _agents_client = None

# For testing
if __name__ == "__main__":
    import asyncio
    
    async def test():
        try:
            analysis = await get_risk_analysis_async("AAPL")
            print("Risk Analysis Result:")
            print(json.dumps(analysis.to_dict(), indent=2))
        except Exception as e:
            print(f"Test failed: {e}")
    
    asyncio.run(test())
