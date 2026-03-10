"""Pydantic v2 schemas for Reading."""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReadingBase(BaseModel):
    water_point_id: uuid.UUID
    recorded_at: datetime
    ph: float = Field(..., ge=0, le=14)
    tds: float = Field(..., ge=0)
    turbidity: float = Field(..., ge=0)
    fluoride: float = Field(..., ge=0)
    nitrate: float = Field(..., ge=0)
    coliform: float = Field(..., ge=0)
    water_level: float | None = None
    pump_yield: float | None = None
    source: str = Field(default="manual", pattern="^(manual|sensor|lab|satellite)$")
    notes: str | None = None


class ReadingCreate(ReadingBase):
    pass


class ReadingResponse(ReadingBase):
    id: uuid.UUID

    model_config = {"from_attributes": True}
