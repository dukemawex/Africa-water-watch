"""APScheduler background jobs for data refresh and maintenance checks."""
import logging
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _job_refresh_satellite():
    """Refresh satellite data for all water points every 6 hours."""
    from app.services.satellite import refresh_all_water_points

    async with AsyncSessionLocal() as db:
        try:
            count = await refresh_all_water_points(db)
            logger.info("Satellite refresh: updated %d water points", count)
        except Exception as exc:
            logger.error("Satellite refresh job failed: %s", exc)


async def _job_maintenance_check():
    """Hourly: check all water points, create critical alerts, send SMS."""
    from sqlalchemy import select
    from app.models.water_point import WaterPoint
    from app.models.reading import Reading
    from app.models.service_log import ServiceLog
    from app.models.alert import Alert
    from app.services.maintenance import assess_service_need
    from app.services.sms import send_alert_sms

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(WaterPoint))
            points = result.scalars().all()

            for point in points:
                readings_result = await db.execute(
                    select(Reading)
                    .where(Reading.water_point_id == point.id)
                    .order_by(Reading.recorded_at.desc())
                    .limit(30)
                )
                readings = readings_result.scalars().all()

                logs_result = await db.execute(
                    select(ServiceLog)
                    .where(ServiceLog.water_point_id == point.id)
                    .order_by(ServiceLog.created_at.desc())
                    .limit(10)
                )
                logs = logs_result.scalars().all()

                if not readings:
                    continue

                assessment = assess_service_need(point, readings, logs)

                if assessment.urgency_level == "critical":
                    # Check if we already sent an alert in last 24h
                    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
                    existing = await db.execute(
                        select(Alert)
                        .where(
                            Alert.water_point_id == point.id,
                            Alert.severity == "critical",
                            Alert.resolved == False,
                            Alert.created_at >= cutoff,
                        )
                        .limit(1)
                    )
                    if existing.scalar():
                        continue

                    issues = ", ".join(assessment.triggered_by[:3])
                    message = f"{point.name} ({point.country}) requires CRITICAL maintenance: {issues}"

                    alert = Alert(
                        water_point_id=point.id,
                        severity="critical",
                        message=message,
                        sms_sent=False,
                    )
                    db.add(alert)
                    await db.flush()

                    # Send SMS to users associated with the water point's country
                    from app.models.user import User
                    from sqlalchemy import select as sa_select
                    users_result = await db.execute(
                        sa_select(User).where(
                            User.country == point.country,
                            User.phone.isnot(None),
                            User.is_active == True,
                        )
                    )
                    phone_numbers = [u.phone for u in users_result.scalars().all() if u.phone]
                    if phone_numbers:
                        sent = await send_alert_sms(phone_numbers, message)
                        alert.sms_sent = sent
                        alert.sms_recipients = phone_numbers

            await db.commit()
        except Exception as exc:
            logger.error("Maintenance check job failed: %s", exc)
            await db.rollback()


async def _job_generate_treatment_plans():
    """Daily: auto-generate treatment plans for danger water points."""
    from sqlalchemy import select
    from app.models.water_point import WaterPoint
    from app.models.reading import Reading
    from app.models.service_log import ServiceLog
    from app.models.treatment_plan import TreatmentPlan
    from app.services.openrouter import generate_treatment_plan

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(WaterPoint).where(WaterPoint.status == "danger")
            )
            points = result.scalars().all()

            for point in points:
                # Check if plan exists in last 7 days
                cutoff = datetime.now(timezone.utc) - timedelta(days=7)
                existing = await db.execute(
                    select(TreatmentPlan)
                    .where(
                        TreatmentPlan.water_point_id == point.id,
                        TreatmentPlan.generated_at >= cutoff,
                    )
                    .limit(1)
                )
                if existing.scalar():
                    continue

                readings_result = await db.execute(
                    select(Reading)
                    .where(Reading.water_point_id == point.id)
                    .order_by(Reading.recorded_at.desc())
                    .limit(10)
                )
                readings = readings_result.scalars().all()

                logs_result = await db.execute(
                    select(ServiceLog)
                    .where(ServiceLog.water_point_id == point.id)
                    .order_by(ServiceLog.created_at.desc())
                    .limit(5)
                )
                logs = logs_result.scalars().all()

                try:
                    plan_data = await generate_treatment_plan(point, list(readings), list(logs))
                    plan = TreatmentPlan(
                        water_point_id=point.id,
                        ai_model=plan_data.get("ai_model", "rule-based"),
                        summary=plan_data.get("summary", ""),
                        urgency=plan_data.get("urgency", "high"),
                        immediate_actions=plan_data.get("immediate_actions", []),
                        treatment_steps=plan_data.get("treatment_steps", []),
                        prevention_tips=plan_data.get("prevention_tips", []),
                        estimated_cost_usd=plan_data.get("estimated_total_cost_usd"),
                        safe_to_drink=plan_data.get("safe_to_drink", False),
                        boil_water_advisory=plan_data.get("boil_water_advisory", True),
                        raw_ai_response=plan_data.get("raw_ai_response"),
                    )
                    db.add(plan)
                except Exception as exc:
                    logger.error("Treatment plan generation failed for %s: %s", point.id, exc)

            await db.commit()
        except Exception as exc:
            logger.error("Treatment plan job failed: %s", exc)
            await db.rollback()


def start_scheduler():
    """Register and start all background jobs."""
    scheduler.add_job(_job_refresh_satellite, IntervalTrigger(hours=6), id="satellite_refresh", replace_existing=True)
    scheduler.add_job(_job_maintenance_check, IntervalTrigger(hours=1), id="maintenance_check", replace_existing=True)
    scheduler.add_job(_job_generate_treatment_plans, IntervalTrigger(hours=24), id="treatment_plans", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started with 3 jobs")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
