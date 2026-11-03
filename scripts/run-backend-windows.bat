@echo off
setlocal
cd /d "%~dp0..\backend"

if not exist .venv (
  echo Creating Python virtual environment...
  python -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Starting FastAPI backend at http://localhost:8000
uvicorn app.main:app --reload --port 8000
