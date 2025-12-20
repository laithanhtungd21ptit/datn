@echo off
REM Script to activate virtual environment and start YOLO service (Windows)

cd /d "%~dp0"

echo 🚀 Activating Python virtual environment...
call venv\Scripts\activate.bat

echo ✅ Virtual environment activated!
python --version
pip --version

echo.
echo 🔍 Checking required packages...
python -c "import fastapi, uvicorn, ultralytics, cv2, torch; print('✅ All packages are installed!')" 2>nul

if %errorlevel% equ 0 (
    echo.
    echo 🚀 Starting YOLO Object Detection Service...
    echo 📍 Service will run on: http://localhost:8001
    echo 📖 API docs available at: http://localhost:8001/docs
    echo.
    echo Press Ctrl+C to stop the service
    echo.
    
    REM Start the service
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
) else (
    echo ❌ Error: Some packages are missing!
    echo Installing packages from requirements.txt...
    pip install -r requirements.txt
    echo.
    echo ✅ Packages installed! Please run this script again.
    pause
)

