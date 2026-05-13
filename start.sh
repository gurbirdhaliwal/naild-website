#!/bin/bash

echo "🚀 Starting Memotree Interview Platform..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing frontend dependencies..."
npm install

echo "🐍 Installing Python backend dependencies..."
cd python_backend
pip install -r requirements.txt
cd ..

echo "🔧 Checking if Ollama is installed..."
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama is not installed. Please install Ollama from https://ollama.ai/"
    echo "   After installation, run: ollama pull mistral"
fi

echo ""
echo "🎯 Starting services..."
echo "   Frontend will be available at: http://localhost:3000"
echo "   Backend will be available at: http://localhost:8081"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start backend in background
echo "🔊 Starting Python backend..."
cd python_backend
python main.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🌐 Starting Next.js frontend..."
npm run dev

# Cleanup on exit
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID 2>/dev/null; exit" INT 
