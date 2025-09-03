@echo off
echo.
echo ================================================
echo  FinApp AI - Deeper Analysis Feature Setup
echo ================================================
echo.

echo [1/5] Installing Python dependencies...
cd python-backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo [2/5] Installing Node.js dependencies...
cd ..
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo [3/5] Checking environment variables...
if not defined PROJECT_ENDPOINT (
    if not defined AZURE_AI_FOUNDRY_ENDPOINT (
        echo WARNING: PROJECT_ENDPOINT or AZURE_AI_FOUNDRY_ENDPOINT not set
        echo Please set up your Azure AI Foundry environment variables
    )
)

if not defined BING_CONNECTION_NAME (
    if not defined BING_GROUNDING_CONNECTION_ID (
        echo WARNING: BING_CONNECTION_NAME or BING_GROUNDING_CONNECTION_ID not set
        echo Please set up your Bing Search connection
    )
)

echo [4/5] Testing Python backend...
cd python-backend
python -c "import sys; sys.path.append('.'); from main import app; print('✅ Backend imports successful')"
if %errorlevel% neq 0 (
    echo ERROR: Backend test failed
    pause
    exit /b 1
)

echo [5/5] Setup complete!
echo.
echo ================================================
echo  Setup Complete! Next Steps:
echo ================================================
echo.
echo 1. Set up your Azure environment variables:
echo    - PROJECT_ENDPOINT or AZURE_AI_FOUNDRY_ENDPOINT
echo    - BING_CONNECTION_NAME or BING_GROUNDING_CONNECTION_ID
echo    - MODEL_DEPLOYMENT_NAME (optional, defaults to gpt-4o-mini)
echo.
echo 2. Start the Python backend:
echo    cd python-backend
echo    python main.py
echo.
echo 3. In a new terminal, start the frontend:
echo    npm run dev
echo.
echo 4. Test the analysis agents:
echo    cd python-backend
echo    python test_analysis_agents.py
echo.
echo 5. Access the app at http://localhost:3000
echo    Navigate to any stock page and click "Deeper Analysis"
echo.
echo For detailed setup instructions, see DEEPER_ANALYSIS_README.md
echo.
pause
