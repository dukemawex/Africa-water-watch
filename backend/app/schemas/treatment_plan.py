"""Pydantic v2 schemas for TreatmentPlan."""
import uuid
from datetime import datetime, date
from typing import Any, List

from pydantic import BaseModel


class TreatmentPlanResponse(BaseModel):
    id: uuid.UUID
    water_point_id: uuid.UUID
    generated_at: datetime
    ai_model: str | None
    summary: str
    urgency: str
    immediate_actions: List[str] | None
    treatment_steps: Any | None
    prevention_tips: List[str] | None
    next_test_date: date | None
    next_service_date: date | None
    estimated_cost_usd: float | None
    safe_to_drink: bool
    boil_water_advisory: bool
    raw_ai_response: str | None

    model_config = {"from_attributes": True}
