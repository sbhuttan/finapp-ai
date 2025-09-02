#!/bin/bash

# Setup and start Python backend

echo "🐍 Setting up Python Backend for Market Analysis AI"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Start the server
echo "🚀 Starting Python backend server on port 8000..."
echo "📡 API will be available at: http://localhost:8000"
echo "📚 API documentation: http://localhost:8000/docs"
echo ""
echo "Frontend should connect to this backend instead of Next.js API routes"
echo ""

python main.py
