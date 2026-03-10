"""Alerts router."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alert import Alert
from app.models.water_point import WaterPoint
from app.routers.auth import get_current_user
from app.schemas.alert import AlertResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    severity: str | None = None,
    resolved: bool | None = None,
    water_point_id: uuid.UUID | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(Alert, WaterPoint.name).join(WaterPoint, Alert.water_point_id == WaterPoint.id)
    if severity:
        q = q.where(Alert.severity == severity)
    if resolved is not None:
        q = q.where(Alert.resolved == resolved)
    if water_point_id:
        q = q.where(Alert.water_point_id == water_point_id)
    q = q.order_by(Alert.created_at.desc()).limit(limit)

    result = await db.execute(q)
    rows = result.all()
    alerts = []
    for alert, wp_name in rows:
        a = AlertResponse.model_validate(alert, from_attributes=True)
        a.water_point_name = wp_name
        alerts.append(a)
    return alerts


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    return alert
