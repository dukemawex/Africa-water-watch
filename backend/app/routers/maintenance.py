"""Maintenance router — service queue, assessments, schedules, treatment plans."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.service_log import ServiceLog
from app.models.treatment_plan import TreatmentPlan
from app.models.water_point import WaterPoint
from app.models.reading import Reading
from app.models.alert import Alert
from app.routers.auth import get_current_user
from app.schemas.service_log import ServiceLogCreate, ServiceLogComplete, ServiceLogResponse
from app.schemas.treatment_plan import TreatmentPlanResponse
from app.services.maintenance import assess_service_need
from app.services.openrouter import generate_treatment_plan
from app.services.sms import send_alert_sms

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("/queue")
async def get_maintenance_queue(db: AsyncSession = Depends(get_db)):
    """Return all water points requiring service, sorted by urgency."""
    result = await db.execute(select(WaterPoint))
    points = result.scalars().all()

    queue = []
    for point in points:
        readings_result = await db.execute(
            select(Reading).where(Reading.water_point_id == point.id).order_by(Reading.recorded_at.desc()).limit(30)
        )
        readings = readings_result.scalars().all()

        logs_result = await db.execute(
            select(ServiceLog).where(ServiceLog.water_point_id == point.id).order_by(ServiceLog.created_at.desc()).limit(10)
        )
        logs = logs_result.scalars().all()

        assessment = assess_service_need(point, list(readings), list(logs))
        if assessment.urgency_level:
            queue.append({
                "water_point_id": str(point.id),
                "name": point.name,
                "country": point.country,
                "type": point.type,
                "last_serviced": point.last_serviced.isoformat() if point.last_serviced else None,
                "quality_score": point.quality_score,
                "status": point.status,
                "urgency_level": assessment.urgency_level,
                "days_until_due": assessment.days_until_due,
                "triggered_by": assessment.triggered_by,
                "estimated_cost_usd": assessment.estimated_cost_usd,
                "recommended_date": assessment.recommended_date.isoformat() if assessment.recommended_date else None,
            })

    urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    queue.sort(key=lambda x: (urgency_order.get(x["urgency_level"], 9), x["days_until_due"]))
    return queue


@router.get("/{water_point_id}/assessment")
async def get_assessment(water_point_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WaterPoint).where(WaterPoint.id == water_point_id))
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Water point not found")

    readings_result = await db.execute(
        select(Reading).where(Reading.water_point_id == water_point_id).order_by(Reading.recorded_at.desc()).limit(30)
    )
    readings = readings_result.scalars().all()

    logs_result = await db.execute(
        select(ServiceLog).where(ServiceLog.water_point_id == water_point_id).order_by(ServiceLog.created_at.desc()).limit(10)
    )
    logs = logs_result.scalars().all()

    assessment = assess_service_need(point, list(readings), list(logs))
    return {
        "urgency_level": assessment.urgency_level,
        "days_until_due": assessment.days_until_due,
        "triggered_by": assessment.triggered_by,
        "recommended_date": assessment.recommended_date.isoformat() if assessment.recommended_date else None,
        "estimated_cost_usd": assessment.estimated_cost_usd,
    }


@router.post("/schedule", response_model=ServiceLogResponse, status_code=status.HTTP_201_CREATED)
async def schedule_service(
    body: ServiceLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    wp_result = await db.execute(select(WaterPoint).where(WaterPoint.id == body.water_point_id))
    if not wp_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Water point not found")

    log = ServiceLog(
        water_point_id=body.water_point_id,
        scheduled_date=body.scheduled_date,
        service_type=body.service_type,
        urgency=body.urgency,
        technician=body.technician,
        cost_usd=body.cost_usd,
        notes=body.notes,
        triggered_by=body.triggered_by,
        status="scheduled",
        before_score=(
            await db.scalar(
                select(WaterPoint.quality_score).where(WaterPoint.id == body.water_point_id)
            )
        ),
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.post("/{log_id}/complete", response_model=ServiceLogResponse)
async def complete_service(
    log_id: uuid.UUID,
    body: ServiceLogComplete,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(ServiceLog).where(ServiceLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Service log not found")

    log.completed_date = body.completed_date
    log.after_score = body.after_score
    log.status = "completed"
    if body.notes:
        log.notes = body.notes
    if body.cost_usd is not None:
        log.cost_usd = body.cost_usd

    # Update water point last_serviced
    wp_result = await db.execute(select(WaterPoint).where(WaterPoint.id == log.water_point_id))
    wp = wp_result.scalar_one_or_none()
    if wp:
        wp.last_serviced = body.completed_date

    await db.commit()
    await db.refresh(log)
    return log


@router.post("/treatment-plan/{water_point_id}", response_model=TreatmentPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_treatment_plan(
    water_point_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
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

    plan_data = await generate_treatment_plan(point, list(readings), list(logs))

    plan = TreatmentPlan(
        water_point_id=water_point_id,
        ai_model=plan_data.get("ai_model"),
        summary=plan_data.get("summary", ""),
        urgency=plan_data.get("urgency", "medium"),
        immediate_actions=plan_data.get("immediate_actions", []),
        treatment_steps=plan_data.get("treatment_steps", []),
        prevention_tips=plan_data.get("prevention_tips", []),
        next_test_date=plan_data.get("next_test_date"),
        next_service_date=plan_data.get("next_service_date"),
        estimated_cost_usd=plan_data.get("estimated_total_cost_usd"),
        safe_to_drink=plan_data.get("safe_to_drink", True),
        boil_water_advisory=plan_data.get("boil_water_advisory", False),
        raw_ai_response=plan_data.get("raw_ai_response"),
    )
    db.add(plan)

    if not plan.safe_to_drink:
        alert = Alert(
            water_point_id=water_point_id,
            severity="critical",
            message=f"{point.name}: NOT SAFE TO DRINK — {plan.summary[:200]}",
        )
        db.add(alert)

    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/treatment-plans/{water_point_id}", response_model=list[TreatmentPlanResponse])
async def list_treatment_plans(water_point_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TreatmentPlan)
        .where(TreatmentPlan.water_point_id == water_point_id)
        .order_by(TreatmentPlan.generated_at.desc())
    )
    return result.scalars().all()
