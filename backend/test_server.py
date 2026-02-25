from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from server import app

client = TestClient(app)

FAKE_IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="


# ── Health ──────────────────────────────────────────────────────────


def test_health_returns_ok():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "openai_key_configured" in body


# ── Validation ──────────────────────────────────────────────────────


def test_rejects_non_image_data_url():
    res = client.post("/screen-solve", json={"image_data_url": "not-a-data-url"})
    assert res.status_code == 400
    assert "Invalid image data URL" in res.json()["detail"]


def test_rejects_missing_body():
    res = client.post("/screen-solve", json={})
    assert res.status_code == 422


# ── Successful solve (mocked OpenAI) ────────────────────────────────


def _mock_completion(content: str):
    choice = MagicMock()
    choice.message.content = content
    completion = MagicMock()
    completion.choices = [choice]
    return completion


@patch("server.client")
def test_solve_returns_answer(mock_openai):
    mock_openai.chat.completions.create.return_value = _mock_completion(
        '{"answer": "15", "confidence": 0.95, "rationale": "Pattern increases by 3"}'
    )
    res = client.post("/screen-solve", json={"image_data_url": FAKE_IMAGE})
    assert res.status_code == 200
    body = res.json()
    assert body["answer"] == "15"
    assert body["confidence"] == 0.95
    assert "3" in body["rationale"]


@patch("server.client")
def test_solve_strips_markdown_fences(mock_openai):
    mock_openai.chat.completions.create.return_value = _mock_completion(
        '```json\n{"answer": "42", "confidence": 0.8, "rationale": "Computed"}\n```'
    )
    res = client.post("/screen-solve", json={"image_data_url": FAKE_IMAGE})
    assert res.status_code == 200
    assert res.json()["answer"] == "42"


@patch("server.client")
def test_solve_clamps_confidence(mock_openai):
    mock_openai.chat.completions.create.return_value = _mock_completion(
        '{"answer": "x", "confidence": 1.5, "rationale": "over"}'
    )
    res = client.post("/screen-solve", json={"image_data_url": FAKE_IMAGE})
    assert res.status_code == 200
    assert res.json()["confidence"] == 1.0


# ── Error handling ──────────────────────────────────────────────────


@patch("server.client")
def test_solve_returns_502_on_bad_json(mock_openai):
    mock_openai.chat.completions.create.return_value = _mock_completion(
        "This is not JSON at all"
    )
    res = client.post("/screen-solve", json={"image_data_url": FAKE_IMAGE})
    assert res.status_code == 502
    assert "invalid JSON" in res.json()["detail"]


@patch("server.client")
def test_solve_returns_500_on_api_error(mock_openai):
    mock_openai.chat.completions.create.side_effect = RuntimeError("API down")
    res = client.post("/screen-solve", json={"image_data_url": FAKE_IMAGE})
    assert res.status_code == 500
    assert "API down" in res.json()["detail"]
