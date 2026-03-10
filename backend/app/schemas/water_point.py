"""Pydantic v2 schemas for WaterPoint."""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class WaterPointBase(BaseModel):
    name: str = Field(..., max_length=200)
    type: str = Field(..., pattern="^(borehole|river|lake|reservoir|spring|piped)$")
    country: str | None = None
    region: str | None = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    depth_m: float | None = None
    geology: str | None = None
    population: int = Field(default=0, ge=0)


class WaterPointCreate(WaterPointBase):
    pass


class WaterPointUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    type: str | None = Field(None, pattern="^(borehole|river|lake|reservoir|spring|piped)$")
    country: str | None = None
    region: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    depth_m: float | None = None
    geology: str | None = None
    population: int | None = Field(None, ge=0)
    status: str | None = Field(None, pattern="^(safe|warning|danger)$")


class WaterPointResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    country: str | None
    region: str | None
    latitude: float
    longitude: float
    depth_m: float | None
    geology: str | None
    population: int
    status: str
    quality_score: float
    last_tested: datetime | None
    last_serviced: datetime | None
    ndwi: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WaterPointSummary(WaterPointResponse):
    recent_readings: list[Any] = []
    latest_treatment_plan: Any | None = None
    service_status: Any | None = None
