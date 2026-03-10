"""Readings router."""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.reading import Reading
from app.models.water_point import WaterPoint
from app.models.alert import Alert
from app.schemas.reading import ReadingCreate, ReadingResponse
from app.services.scoring import compute_quality_score, get_status

router = APIRouter(prefix="/readings", tags=["readings"])


@router.get("/{water_point_id}", response_model=list[ReadingResponse])
async def list_readings(
    water_point_id: uuid.UUID,
    limit: int = Query(default=30, ge=1, le=200),
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Reading).where(Reading.water_point_id == water_point_id).order_by(Reading.recorded_at.desc())
    if from_date:
        q = q.where(Reading.recorded_at >= from_date)
    if to_date:
        q = q.where(Reading.recorded_at <= to_date)
    q = q.limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=ReadingResponse, status_code=status.HTTP_201_CREATED)
async def submit_reading(body: ReadingCreate, db: AsyncSession = Depends(get_db)):
    wp_result = await db.execute(select(WaterPoint).where(WaterPoint.id == body.water_point_id))
    water_point = wp_result.scalar_one_or_none()
    if not water_point:
        raise HTTPException(status_code=404, detail="Water point not found")

    reading = Reading(**body.model_dump())
    db.add(reading)

    # Recompute quality score
    score = compute_quality_score(reading)
    new_status = get_status(score)
    water_point.quality_score = score
    water_point.status = new_status
    water_point.last_tested = body.recorded_at

    await db.flush()

    # Trigger maintenance check and alert if crossing CRITICAL threshold
    if new_status == "danger":
        alert = Alert(
            water_point_id=water_point.id,
            severity="critical",
            message=(
                f"{water_point.name} water quality score dropped to {score:.0f}/100 "
                f"(pH={reading.ph}, TDS={reading.tds}, Turbidity={reading.turbidity}, Coliform={reading.coliform})"
            ),
        )
        db.add(alert)
    elif new_status == "warning":
        alert = Alert(
            water_point_id=water_point.id,
            severity="warning",
            message=(
                f"{water_point.name} water quality is degraded: score {score:.0f}/100"
            ),
        )
        db.add(alert)

    await db.commit()
    await db.refresh(reading)
    return reading
