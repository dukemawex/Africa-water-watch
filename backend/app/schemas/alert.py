"""Pydantic v2 schemas for Alert."""
import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel


class AlertResponse(BaseModel):
    id: uuid.UUID
    water_point_id: uuid.UUID
    severity: str
    message: str
    sms_sent: bool
    sms_recipients: List[str] | None
    resolved: bool
    resolved_at: datetime | None
    created_at: datetime
    water_point_name: str | None = None

    model_config = {"from_attributes": True}
