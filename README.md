# CCAT Solver

A Manifest V3 Chrome extension that captures your visible tab with a hotkey, sends the screenshot to an AI vision model, and displays the answer as a sleek overlay — all in under 15 seconds.

## How It Works

1. Press **Cmd+Shift+Y** (Mac) or **Ctrl+Shift+Y** (Windows/Linux)
2. The extension captures and compresses the visible tab (JPEG, 70% quality, max 1280px wide)
3. Sends it to a local FastAPI backend which forwards it to GPT-4.1-mini vision
4. The answer, confidence score, and rationale appear in a fixed overlay (top-right corner)

### Solving

The overlay shows a loading spinner while the backend processes the screenshot.

![Solving](examples/Solving.png)

### Answer

Once the model responds, the overlay displays the answer with a confidence bar and rationale.

![Answer](examples/Answer.png)

## Project Structure

```
CCAT-solver/
├── manifest.json          # MV3 extension manifest (hotkey, permissions, scripts)
├── sw.js                  # Service worker — capture → compress → POST → relay
├── offscreen.html/js      # Offscreen document for canvas-based JPEG compression
├── content.js             # Content script — renders the overlay UI
└── backend/
    ├── server.py           # FastAPI server — proxies to GPT-4.1-mini vision
    ├── requirements.txt    # Python dependencies
    ├── .env                # Your OpenAI API key (not committed)
    └── .env.example        # Template for .env
```

## Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` with your OpenAI API key:

```
OPENAI_API_KEY=sk-proj-...
```

Start the server:

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

### 2. Chrome Extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked** and select the `CCAT-solver` folder
4. Verify the hotkey at `chrome://extensions/shortcuts` — bind **"Capture screenshot and solve"** to `Cmd+Shift+Y`

### 3. Use It

Navigate to any page, press **Cmd+Shift+Y**, and the answer overlay will appear in the top-right corner. Click **x** to dismiss it early, or it auto-hides after 15 seconds.

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Capture the visible tab screenshot |
| `scripting` | Inject content script into tabs not matched at load time |
| `offscreen` | Create an offscreen document for canvas-based image compression |

## Configuration

| Option | Location | Default |
|---|---|---|
| Backend URL | `sw.js` line 1 | `http://localhost:8000/screen-solve` |
| JPEG quality | `sw.js` `compressImage()` | `0.7` (70%) |
| Max image width | `sw.js` `compressImage()` | `1280` px |
| AI model | `backend/server.py` line 48 | `gpt-4.1-mini` |
| Request timeout | `sw.js` line 23 | `12000` ms |
| Overlay auto-hide | `content.js` line 3 | `15000` ms |
