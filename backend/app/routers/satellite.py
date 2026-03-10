"""Satellite data router."""
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.water_point import WaterPoint
from app.services.satellite import fetch_water_indices, get_thumbnail_base64, refresh_all_water_points

router = APIRouter(prefix="/satellite", tags=["satellite"])


@router.post("/refresh")
async def trigger_refresh(
    x_internal_api_key: str = Header(..., alias="X-Internal-Api-Key"),
    db: AsyncSession = Depends(get_db),
):
    if x_internal_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal API key")
    count = await refresh_all_water_points(db)
    return {"updated": count}


@router.get("/{water_point_id}")
async def get_satellite_data(water_point_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WaterPoint).where(WaterPoint.id == water_point_id))
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Water point not found")

    from geoalchemy2.shape import to_shape
    pt = to_shape(point.location)
    lat, lng = pt.y, pt.x

    indices = await fetch_water_indices(lat, lng)
    thumbnail = await get_thumbnail_base64(lat, lng)

    return {
        "water_point_id": str(water_point_id),
        "ndwi": indices.get("ndwi"),
        "turbidity_index": indices.get("turbidity_index"),
        "chlorophyll": indices.get("chlorophyll"),
        "acquisition_date": indices.get("acquisition_date"),
        "cloud_cover": indices.get("cloud_cover"),
        "thumbnail_base64": thumbnail,
    }
