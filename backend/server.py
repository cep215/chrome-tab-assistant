import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@app.get("/health")
async def health():
    key_set = bool(os.getenv("OPENAI_API_KEY"))
    return {"status": "ok", "openai_key_configured": key_set}

SYSTEM_PROMPT = (
    "You are a visual problem solver. The user sends a screenshot. "
    "Identify any question, problem, or task visible on screen and provide the answer. "
    "Respond ONLY with valid JSON: "
    '{"answer": "<concise answer>", "confidence": <0.0-1.0>, "rationale": "<one sentence explanation>"}'
)


class SolveRequest(BaseModel):
    image_data_url: str


class SolveResponse(BaseModel):
    answer: str
    confidence: float
    rationale: str


@app.post("/screen-solve", response_model=SolveResponse)
async def screen_solve(req: SolveRequest):
    if not req.image_data_url.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Invalid image data URL")

    try:
        completion = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": req.image_data_url, "detail": "high"},
                        },
                    ],
                },
            ],
            max_tokens=300,
            temperature=0.2,
        )

        raw = completion.choices[0].message.content.strip()
        # Strip markdown fences if the model wraps its JSON
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        data = json.loads(raw)
        return SolveResponse(
            answer=data.get("answer", "No answer"),
            confidence=max(0.0, min(1.0, float(data.get("confidence", 0)))),
            rationale=data.get("rationale", ""),
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
