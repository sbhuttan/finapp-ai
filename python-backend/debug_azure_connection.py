#!/usr/bin/env python3
"""
Test Azure AI Projects connection to debug the hanging issue
"""

import os
from dotenv import load_dotenv
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

# Load environment variables
load_dotenv()

def test_azure_connection():
    """Test basic Azure AI Projects connection"""
    print("🔗 Testing Azure AI Projects connection...")
    
    try:
        # Get environment variables
        endpoint = os.getenv("AZURE_AI_FOUNDRY_ENDPOINT")
        project_name = os.getenv("AZURE_AI_FOUNDRY_PROJECT")
        api_key = os.getenv("AZURE_AI_FOUNDRY_API_KEY")
        
        print(f"📍 Endpoint: {endpoint}")
        print(f"📁 Project: {project_name}")
        print(f"🔑 API Key: {api_key[:10]}..." if api_key else "❌ No API Key")
        
        if not all([endpoint, project_name, api_key]):
            print("❌ Missing required environment variables!")
            return False
        
        # Create the client
        print("🏗️ Creating AIProjectClient...")
        project_client = AIProjectClient.from_connection_string(
            conn_str=f"https://{endpoint.split('//')[-1]};{api_key}",
            credential=DefaultAzureCredential()
        )
        
        print("✅ Client created successfully!")
        
        # Test listing agents
        print("📋 Testing agents list...")
        agents_client = project_client.agents
        
        # This might be where it hangs - let's see
        print("🔍 Calling list()...")
        agents = list(agents_client.list())
        print(f"✅ Found {len(agents)} agents")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_azure_connection()
    if success:
        print("\n🎉 Azure connection test passed!")
    else:
        print("\n💥 Azure connection test failed!")
