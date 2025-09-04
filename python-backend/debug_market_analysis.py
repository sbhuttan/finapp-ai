#!/usr/bin/env python3
"""
Quick test of the market analysis agent to debug the hanging issue
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parent directory to the path so we can import our agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.market_analysis_agent_projects import get_market_analysis_async

async def test_market_analysis():
    """Test market analysis for a simple symbol"""
    symbol = "AAPL"
    print(f"🧪 Testing market analysis for {symbol}...")
    
    try:
        print("📊 Calling get_market_analysis_async...")
        analysis = await get_market_analysis_async(symbol)
        print(f"✅ Analysis completed successfully!")
        print(f"📄 Analysis length: {len(analysis.analysis)} characters")
        print(f"🎯 Risk score: {analysis.technical_indicators}")
        return True
    except Exception as e:
        print(f"❌ Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_market_analysis())
    if success:
        print("\n🎉 Market analysis test passed!")
    else:
        print("\n💥 Market analysis test failed!")
        sys.exit(1)
