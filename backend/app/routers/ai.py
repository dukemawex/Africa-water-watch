"""AI router — analyze water quality and chat with context."""
import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.water_point import WaterPoint
from app.models.reading import Reading
from app.models.service_log import ServiceLog
from app.routers.auth import get_current_user
from app.services.openrouter import call_openrouter_stream, WATER_ENGINEER_SYSTEM

router = APIRouter(prefix="/ai", tags=["ai"])

SUPPORTED_LANGUAGES = {"english", "french", "hausa", "swahili"}


class AnalyzeRequest(BaseModel):
    water_point_id: uuid.UUID
    question: str | None = None
    language: str = "english"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    water_point_id: uuid.UUID
    messages: list[ChatMessage]
    language: str = "english"


async def _build_context(water_point_id: uuid.UUID, db: AsyncSession) -> tuple[WaterPoint, str]:
    result = await db.execute(select(WaterPoint).where(WaterPoint.id == water_point_id))
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Water point not found")

    readings_result = await db.execute(
        select(Reading).where(Reading.water_point_id == water_point_id).order_by(Reading.recorded_at.desc()).limit(10)
    )
    readings = readings_result.scalars().all()

    logs_result = await db.execute(
        select(ServiceLog).where(ServiceLog.water_point_id == water_point_id).order_by(ServiceLog.created_at.desc()).limit(5)
    )
    logs = logs_result.scalars().all()

    readings_data = [
        {
            "recorded_at": r.recorded_at.isoformat(),
            "ph": r.ph, "tds": r.tds, "turbidity": r.turbidity,
            "fluoride": r.fluoride, "nitrate": r.nitrate, "coliform": r.coliform,
        }
        for r in readings
    ]

    context = (
        f"Water Point Context:\n"
        f"Name: {point.name}\nType: {point.type}\nCountry: {point.country}\n"
        f"Region: {point.region}\nGeology: {point.geology or 'unknown'}\n"
        f"Population served: {point.population}\nCurrent status: {point.status}\n"
        f"Quality score: {point.quality_score:.0f}/100\n"
        f"Recent readings: {json.dumps(readings_data)}\n"
        f"Service history entries: {len(logs)}\n"
    )
    return point, context


@router.post("/analyze")
async def analyze(body: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    """Stream AI analysis of water quality."""
    point, context = await _build_context(body.water_point_id, db)

    lang = body.language.lower()
    lang_prefix = f"Respond in {lang.title()}. " if lang in SUPPORTED_LANGUAGES and lang != "english" else ""
    system = lang_prefix + WATER_ENGINEER_SYSTEM

    question = body.question or (
        f"Provide a comprehensive water quality analysis for {point.name}. "
        "Include: safety assessment, key concerns, recommended actions, and seasonal risks."
    )

    messages = [{"role": "user", "content": f"{context}\n\nQuestion: {question}"}]

    async def event_stream():
        try:
            async for token in call_openrouter_stream(messages, system):
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/chat")
async def chat(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Multi-turn AI chat with water point context injected."""
    point, context = await _build_context(body.water_point_id, db)

    lang = body.language.lower()
    lang_prefix = f"Respond in {lang.title()}. " if lang in SUPPORTED_LANGUAGES and lang != "english" else ""
    system = (
        lang_prefix + WATER_ENGINEER_SYSTEM +
        f"\n\nYou are answering questions about the following water point:\n{context}"
    )

    messages = [{"role": m.role, "content": m.content} for m in body.messages]

    async def event_stream():
        try:
            async for token in call_openrouter_stream(messages, system):
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
