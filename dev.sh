#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/backend"

# Create venv if missing
if [ ! -d .venv ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

# Check for .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "!! Created backend/.env — paste your OPENAI_API_KEY there and re-run."
  exit 1
fi

echo ""
echo "Backend starting at http://localhost:8000"
echo ""
echo "Chrome extension setup:"
echo "  1. Open chrome://extensions"
echo "  2. Enable Developer mode (top-right toggle)"
echo "  3. Click Load unpacked → select the CCAT-solver root folder"
echo "  4. Bind hotkey at chrome://extensions/shortcuts → Cmd+Shift+Y"
echo ""

uvicorn server:app --host 0.0.0.0 --port 8000
