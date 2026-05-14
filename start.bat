@echo off
echo 🚀 Starting Knappi Interview Platform...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies...
npm install

echo 🐍 Installing Python backend dependencies...
cd python_backend
pip install -r requirements.txt
cd ..

echo 🔧 Checking if Ollama is installed...
ollama --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Ollama is not installed. Please install Ollama from https://ollama.ai/
    echo    After installation, run: ollama pull mistral
)

echo.
echo 🎯 Starting services...
echo    Frontend will be available at: http://localhost:3000
echo    Backend will be available at: http://localhost:8081
echo.
echo Press Ctrl+C to stop all services
echo.

REM Start backend in background
echo 🔊 Starting Python backend...
start /B python python_backend/main.py

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo 🌐 Starting Next.js frontend...
npm run dev

pause 
