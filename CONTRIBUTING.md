# Contributing

Thanks for your interest in improving CCAT Solver!

## Local Development

### Backend

```bash
./dev.sh
```

This creates the venv, installs deps, and starts the backend. On first run it creates `backend/.env` for you to fill in your OpenAI key.

Run tests:

```bash
cd backend && ../.venv/bin/python -m pytest test_server.py -v
```

### Chrome Extension

1. Open `chrome://extensions` → enable Developer mode → Load unpacked → select repo root
2. After editing extension files, click the reload icon on the extension card
3. Check the service worker console via the "service worker" link on the extension card

## Where to Add Features

| Area | Files |
|---|---|
| Hotkey / capture logic | `sw.js` |
| Image compression | `offscreen.js` |
| Overlay UI / styling | `content.js` |
| Backend / AI model | `backend/server.py` |
| Prompt tuning | `backend/prompt.txt` |
| Model selection | `model=` parameter in `backend/server.py` (line 54) |

## Changing the AI Model

The model is set in `backend/server.py` inside the `screen_solve` function:

```python
completion = client.chat.completions.create(
    model="gpt-4.1-mini",   # ← change this
    ...
)
```

Options: `gpt-4.1-mini` (default, fast), `gpt-4.1-nano` (fastest), `gpt-4o` (most capable), or any OpenAI model that supports vision.

## Guidelines

- Keep changes focused — one feature or fix per PR
- Add tests for backend changes
- Don't commit `.env` or API keys
- Run `pytest` before pushing

## Submitting

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Open a pull request against `main`
