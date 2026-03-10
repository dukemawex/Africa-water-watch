"""Water points router."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID, ST_AsText
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.water_point import WaterPoint
from app.models.reading import Reading
from app.models.treatment_plan import TreatmentPlan
from app.routers.auth import get_current_user, require_admin
from app.schemas.water_point import WaterPointCreate, WaterPointUpdate, WaterPointResponse, WaterPointSummary
from app.schemas.reading import ReadingResponse
from app.schemas.treatment_plan import TreatmentPlanResponse

router = APIRouter(prefix="/water-points", tags=["water-points"])


def _geom_to_coords(wkb_element) -> tuple[float, float]:
    """Extract lat/lng from WKBElement."""
    from geoalchemy2.shape import to_shape
    point = to_shape(wkb_element)
    return point.y, point.x


def _point_to_response(point: WaterPoint) -> dict:
    lat, lng = _geom_to_coords(point.location)
    data = {c.name: getattr(point, c.name) for c in WaterPoint.__table__.columns}
    data["latitude"] = lat
    data["longitude"] = lng
    data.pop("location", None)
    return data


@router.get("", response_model=list[WaterPointResponse])
async def list_water_points(
    country: str | None = None,
    region: str | None = None,
    type: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(WaterPoint)
    if country:
        q = q.where(WaterPoint.country == country)
    if region:
        q = q.where(WaterPoint.region == region)
    if type:
        q = q.where(WaterPoint.type == type)
    if status:
        q = q.where(WaterPoint.status == status)
    result = await db.execute(q.order_by(WaterPoint.name))
    points = result.scalars().all()
    return [_point_to_response(p) for p in points]


@router.get("/nearby", response_model=list[WaterPointResponse])
async def get_nearby(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=50, gt=0, le=500),
    db: AsyncSession = Depends(get_db),
):
    radius_deg = radius_km / 111.0
    user_point = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    q = select(WaterPoint).where(
        ST_DWithin(WaterPoint.location, user_point, radius_deg)
    )
    result = await db.execute(q)
    points = result.scalars().all()
    return [_point_to_response(p) for p in points]


@router.get("/{point_id}", response_model=WaterPointResponse)
async def get_water_point(point_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WaterPoint).where(WaterPoint.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Water point not found")
    return _point_to_response(point)


@router.get("/{point_id}/summary", response_model=WaterPointSummary)
async def get_summary(point_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WaterPoint).where(WaterPoint.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Water point not found")

    readings_result = await db.execute(
        select(Reading)
        .where(Reading.water_point_id == point_id)
        .order_by(Reading.recorded_at.desc())
        .limit(30)
    )
    readings = readings_result.scalars().all()

    plan_result = await db.execute(
        select(TreatmentPlan)
        .where(TreatmentPlan.water_point_id == point_id)
        .order_by(TreatmentPlan.generated_at.desc())
        .limit(1)
    )
    latest_plan = plan_result.scalar_one_or_none()

    from app.services.maintenance import assess_service_need
    from app.models.service_log import ServiceLog

    logs_result = await db.execute(
        select(ServiceLog).where(ServiceLog.water_point_id == point_id).order_by(ServiceLog.created_at.desc()).limit(10)
    )
    logs = logs_result.scalars().all()
    assessment = assess_service_need(point, list(readings), list(logs))

    response = _point_to_response(point)
    response["recent_readings"] = [ReadingResponse.model_validate(r, from_attributes=True).model_dump() for r in readings]
    response["latest_treatment_plan"] = TreatmentPlanResponse.model_validate(latest_plan, from_attributes=True).model_dump() if latest_plan else None
    response["service_status"] = {
        "urgency_level": assessment.urgency_level,
        "days_until_due": assessment.days_until_due,
        "triggered_by": assessment.triggered_by,
        "estimated_cost_usd": assessment.estimated_cost_usd,
    }
    return response


@router.post("", response_model=WaterPointResponse, status_code=status.HTTP_201_CREATED)
async def create_water_point(
    body: WaterPointCreate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    from geoalchemy2.elements import WKTElement

    point = WaterPoint(
        name=body.name,
        type=body.type,
        country=body.country,
        region=body.region,
        location=WKTElement(f"POINT({body.longitude} {body.latitude})", srid=4326),
        depth_m=body.depth_m,
        geology=body.geology,
        population=body.population,
    )
    db.add(point)
    await db.commit()
    await db.refresh(point)
    return _point_to_response(point)


@router.patch("/{point_id}", response_model=WaterPointResponse)
async def update_water_point(
    point_id: uuid.UUID,
    body: WaterPointUpdate,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(WaterPoint).where(WaterPoint.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Water point not found")

    update_data = body.model_dump(exclude_unset=True)
    lat = update_data.pop("latitude", None)
    lng = update_data.pop("longitude", None)

    for k, v in update_data.items():
        setattr(point, k, v)

    if lat is not None and lng is not None:
        from geoalchemy2.elements import WKTElement
        point.location = WKTElement(f"POINT({lng} {lat})", srid=4326)

    await db.commit()
    await db.refresh(point)
    return _point_to_response(point)


@router.delete("/{point_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_water_point(
    point_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    result = await db.execute(select(WaterPoint).where(WaterPoint.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Water point not found")
    await db.delete(point)
    await db.commit()
