#!/bin/bash

# Script to activate virtual environment and start YOLO service

cd "$(dirname "$0")"

echo "🚀 Activating Python virtual environment..."
source venv/bin/activate

echo "✅ Virtual environment activated!"
echo "📦 Python version: $(python --version)"
echo "📦 Pip version: $(pip --version)"

echo ""
echo "🔍 Checking required packages..."
python -c "import fastapi, uvicorn, ultralytics, cv2, torch; print('✅ All packages are installed!')" 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "🚀 Starting YOLO Object Detection Service..."
    echo "📍 Service will run on: http://localhost:8001"
    echo "📖 API docs available at: http://localhost:8001/docs"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo ""
    
    # Start the service
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
else
    echo "❌ Error: Some packages are missing!"
    echo "Installing packages from requirements.txt..."
    pip install -r requirements.txt
    echo ""
    echo "✅ Packages installed! Please run this script again."
fi

