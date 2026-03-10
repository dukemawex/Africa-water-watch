"""OpenRouter AI service — treatment plan generation with fallback."""
import json
import logging
from datetime import date, timedelta

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
HEADERS = {
    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
    "HTTP-Referer": "https://aquawatch-africa.app",
    "X-Title": "AquaWatch Africa",
    "Content-Type": "application/json",
}

WATER_ENGINEER_SYSTEM = (
    "You are a water quality engineer with 20 years experience in sub-Saharan African water systems. "
    "You understand WHO drinking water guidelines, African geology including basement complex, alluvial, "
    "dolomite, and coastal sediment, and low-resource community treatment options in West and Southern Africa. "
    "Always recommend practical affordable methods. Respond ONLY in valid JSON with no markdown or preamble."
)


async def call_openrouter(messages: list[dict], system_prompt: str, max_tokens: int = 1500) -> str:
    """Call OpenRouter with primary model, falling back to secondary on error."""
    async with httpx.AsyncClient(timeout=60) as client:
        for model in [settings.OPENROUTER_PRIMARY_MODEL, settings.OPENROUTER_FALLBACK_MODEL]:
            try:
                payload = {
                    "model": model,
                    "messages": [{"role": "system", "content": system_prompt}] + messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.3,
                }
                resp = await client.post(OPENROUTER_URL, headers=HEADERS, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except Exception as exc:
                logger.warning("OpenRouter model %s failed: %s", model, exc)

    raise RuntimeError("Both OpenRouter models failed")


async def call_openrouter_stream(messages: list[dict], system_prompt: str, max_tokens: int = 1500):
    """Stream tokens from OpenRouter using primary then fallback model."""
    for model in [settings.OPENROUTER_PRIMARY_MODEL, settings.OPENROUTER_FALLBACK_MODEL]:
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                payload = {
                    "model": model,
                    "messages": [{"role": "system", "content": system_prompt}] + messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.5,
                    "stream": True,
                }
                async with client.stream("POST", OPENROUTER_URL, headers=HEADERS, json=payload) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            chunk = line[6:]
                            if chunk == "[DONE]":
                                return
                            try:
                                delta = json.loads(chunk)
                                token = delta["choices"][0]["delta"].get("content", "")
                                if token:
                                    yield token
                            except (json.JSONDecodeError, KeyError):
                                continue
            return
        except Exception as exc:
            logger.warning("Stream model %s failed: %s", model, exc)

    yield "Error: AI service temporarily unavailable."


async def generate_treatment_plan(water_point, readings: list, service_logs: list) -> dict:
    """Generate an AI treatment plan for a water point."""
    readings_data = [
        {
            "recorded_at": r.recorded_at.isoformat(),
            "ph": r.ph,
            "tds": r.tds,
            "turbidity": r.turbidity,
            "fluoride": r.fluoride,
            "nitrate": r.nitrate,
            "coliform": r.coliform,
            "water_level": r.water_level,
            "pump_yield": r.pump_yield,
            "source": r.source,
        }
        for r in readings[-10:]
    ]
    service_data = [
        {
            "scheduled_date": s.scheduled_date.isoformat(),
            "completed_date": s.completed_date.isoformat() if s.completed_date else None,
            "service_type": s.service_type,
            "urgency": s.urgency,
            "status": s.status,
            "notes": s.notes,
        }
        for s in service_logs[-5:]
    ]

    user_prompt = (
        f"Water point: {water_point.name}\n"
        f"Type: {water_point.type}\n"
        f"Country: {water_point.country}\n"
        f"Region: {water_point.region}\n"
        f"Geology: {water_point.geology or 'unknown'}\n"
        f"Depth (m): {water_point.depth_m or 'N/A'}\n"
        f"Population served: {water_point.population}\n"
        f"Last 10 readings (newest first): {json.dumps(readings_data)}\n"
        f"Last 5 service events: {json.dumps(service_data)}\n\n"
        "Generate a comprehensive water quality treatment plan. Return JSON with exactly these fields:\n"
        "summary (2 sentences plain language), urgency (critical/high/medium/low), "
        "safe_to_drink (boolean), boil_water_advisory (boolean), "
        "immediate_actions (string array), "
        "treatment_steps (array of objects: step, method, materials, duration, cost_usd), "
        "prevention_tips (string array), next_test_date (ISO date), "
        "next_service_date (ISO date), estimated_total_cost_usd (number)."
    )

    try:
        raw = await call_openrouter([{"role": "user", "content": user_prompt}], WATER_ENGINEER_SYSTEM)
        # Strip markdown code fences if present
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        plan = json.loads(clean)
        plan["raw_ai_response"] = raw
        return plan
    except Exception as exc:
        logger.error("AI treatment plan generation failed: %s", exc)
        return _rule_based_fallback(water_point, readings)


def _rule_based_fallback(water_point, readings: list) -> dict:
    """Rule-based fallback when AI is unavailable."""
    from app.services.scoring import compute_quality_score, get_status

    score = compute_quality_score(readings[-1]) if readings else 50.0
    status = get_status(score)

    today = date.today()
    return {
        "summary": (
            f"Water quality score is {score:.0f}/100 ({status}). "
            "Manual inspection and testing recommended based on automated rule analysis."
        ),
        "urgency": "high" if status == "danger" else "medium" if status == "warning" else "low",
        "safe_to_drink": status == "safe",
        "boil_water_advisory": status != "safe",
        "immediate_actions": [
            "Collect fresh water sample for laboratory analysis",
            "Restrict drinking use until safe status confirmed",
        ] if status != "safe" else ["Continue regular monitoring"],
        "treatment_steps": [
            {
                "step": 1,
                "method": "Chlorination",
                "materials": "Sodium hypochlorite solution",
                "duration": "30 minutes contact time",
                "cost_usd": 5.0,
            }
        ],
        "prevention_tips": [
            "Test water monthly",
            "Protect catchment from agricultural runoff",
            "Maintain borehole sanitary seal",
        ],
        "next_test_date": (today + timedelta(days=7)).isoformat(),
        "next_service_date": (today + timedelta(days=30)).isoformat(),
        "estimated_total_cost_usd": COST_BY_TYPE_FALLBACK.get(water_point.type, 80.0),
        "raw_ai_response": None,
    }


COST_BY_TYPE_FALLBACK = {
    "borehole": 150.0,
    "river": 80.0,
    "lake": 80.0,
    "reservoir": 80.0,
    "spring": 60.0,
    "piped": 100.0,
}
