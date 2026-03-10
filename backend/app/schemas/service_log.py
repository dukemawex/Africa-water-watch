"""Pydantic v2 schemas for ServiceLog."""
import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ServiceLogCreate(BaseModel):
    water_point_id: uuid.UUID
    scheduled_date: datetime
    service_type: str = Field(..., pattern="^(pump_repair|chemical_treatment|cleaning|chlorination|filter_replace|full_inspection)$")
    urgency: str = Field(default="low", pattern="^(critical|high|medium|low)$")
    technician: str | None = None
    cost_usd: float | None = None
    notes: str | None = None
    triggered_by: List[str] | None = None


class ServiceLogComplete(BaseModel):
    completed_date: datetime
    after_score: float | None = None
    notes: str | None = None
    cost_usd: float | None = None


class ServiceLogResponse(BaseModel):
    id: uuid.UUID
    water_point_id: uuid.UUID
    scheduled_date: datetime
    completed_date: datetime | None
    service_type: str
    urgency: str
    triggered_by: List[str] | None
    technician: str | None
    cost_usd: float | None
    notes: str | None
    status: str
    before_score: float | None
    after_score: float | None
    created_at: datetime

    model_config = {"from_attributes": True}
