@echo off

REM Setup and start Python backend

echo 🐍 Setting up Python Backend for Market Analysis AI

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Start the server
echo 🚀 Starting Python backend server on port 8000...
echo 📡 API will be available at: http://localhost:8000
echo 📚 API documentation: http://localhost:8000/docs
echo.
echo Frontend should connect to this backend instead of Next.js API routes
echo.

python main.py
