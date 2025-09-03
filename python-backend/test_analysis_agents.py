"""
Test script for the new analysis agents
This script tests all three analysis agents independently and together
"""

import asyncio
import json
import sys
import os

# Add the parent directory to the path so we can import our agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.market_analysis_agent import get_market_analysis_async
from agents.sentiment_analysis_agent import get_sentiment_analysis_async  
from agents.risk_analysis_agent import get_risk_analysis_async

async def test_single_agent(agent_func, agent_name, symbol):
    """Test a single agent"""
    print(f"\n{'='*50}")
    print(f"Testing {agent_name} for {symbol}")
    print(f"{'='*50}")
    
    try:
        result = await agent_func(symbol)
        print(f"✅ {agent_name} completed successfully")
        print(f"Result keys: {list(result.to_dict().keys())}")
        
        # Print a subset of the result for verification
        result_dict = result.to_dict()
        for key, value in result_dict.items():
            if key == symbol.lower():
                continue
            if isinstance(value, str) and len(value) > 200:
                print(f"{key}: {value[:200]}...")
            else:
                print(f"{key}: {value}")
        
        return result
    except Exception as e:
        print(f"❌ {agent_name} failed: {str(e)}")
        return None

async def test_all_agents():
    """Test all agents"""
    symbol = "AAPL"  # Use Apple as a test case
    
    print(f"🚀 Starting comprehensive analysis test for {symbol}")
    print(f"This will test all three analysis agents...")
    
    # Test each agent individually
    market_result = await test_single_agent(get_market_analysis_async, "Market Analysis Agent", symbol)
    sentiment_result = await test_single_agent(get_sentiment_analysis_async, "Sentiment Analysis Agent", symbol)
    risk_result = await test_single_agent(get_risk_analysis_async, "Risk Analysis Agent", symbol)
    
    # Test all agents together (simulating the /api/analysis/all endpoint)
    print(f"\n{'='*50}")
    print(f"Testing All Agents Concurrently for {symbol}")
    print(f"{'='*50}")
    
    try:
        market_task = get_market_analysis_async(symbol)
        sentiment_task = get_sentiment_analysis_async(symbol)
        risk_task = get_risk_analysis_async(symbol)
        
        market_analysis, sentiment_analysis, risk_analysis = await asyncio.gather(
            market_task, sentiment_task, risk_task
        )
        
        comprehensive_result = {
            "symbol": symbol,
            "market_analysis": market_analysis.to_dict(),
            "sentiment_analysis": sentiment_analysis.to_dict(),
            "risk_analysis": risk_analysis.to_dict(),
            "generated_at": "test_run"
        }
        
        print("✅ Comprehensive analysis completed successfully")
        print(f"Total result size: {len(json.dumps(comprehensive_result, indent=2))} characters")
        
        # Save results to file for inspection
        with open("test_analysis_results.json", "w") as f:
            json.dump(comprehensive_result, f, indent=2)
        print("📁 Results saved to test_analysis_results.json")
        
    except Exception as e:
        print(f"❌ Comprehensive analysis failed: {str(e)}")

async def test_error_handling():
    """Test error handling with invalid symbol"""
    print(f"\n{'='*50}")
    print(f"Testing Error Handling")
    print(f"{'='*50}")
    
    invalid_symbol = "INVALID_SYMBOL_12345"
    
    try:
        result = await get_market_analysis_async(invalid_symbol)
        print(f"⚠️ Unexpected success with invalid symbol: {invalid_symbol}")
    except Exception as e:
        print(f"✅ Error handling working correctly: {str(e)}")

def main():
    """Main test function"""
    print("🧪 Analysis Agents Test Suite")
    print("=" * 60)
    
    # Check environment variables
    required_env_vars = [
        "PROJECT_ENDPOINT", "AZURE_AI_FOUNDRY_ENDPOINT",
        "BING_CONNECTION_NAME", "BING_GROUNDING_CONNECTION_ID"
    ]
    
    env_check_passed = False
    for var in required_env_vars:
        if os.getenv(var):
            print(f"✅ Found environment variable: {var}")
            env_check_passed = True
            break
    
    if not env_check_passed:
        print("❌ No required environment variables found!")
        print("Please set up one of the following:")
        for var in required_env_vars:
            print(f"  - {var}")
        return
    
    # Run the tests
    try:
        asyncio.run(test_all_agents())
        asyncio.run(test_error_handling())
        print(f"\n{'='*60}")
        print("🎉 Test suite completed!")
        print("Check the test_analysis_results.json file for detailed results.")
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test suite failed: {str(e)}")

if __name__ == "__main__":
    main()
