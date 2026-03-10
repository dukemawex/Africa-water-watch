"""TreatmentPlan model — AI-generated water treatment recommendations."""
import uuid
from datetime import datetime, date
from typing import TYPE_CHECKING

from sqlalchemy import String, Float, DateTime, Date, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.water_point import WaterPoint


class TreatmentPlan(Base):
    __tablename__ = "treatment_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    water_point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False, index=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("NOW()")
    )
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    summary: Mapped[str] = mapped_column(Text(), nullable=False)
    urgency: Mapped[str] = mapped_column(String(20), nullable=False)
    immediate_actions: Mapped[list[str] | None] = mapped_column(ARRAY(Text()), nullable=True)
    treatment_steps: Mapped[dict | None] = mapped_column(JSONB(), nullable=True)
    prevention_tips: Mapped[list[str] | None] = mapped_column(ARRAY(Text()), nullable=True)
    next_test_date: Mapped[date | None] = mapped_column(Date(), nullable=True)
    next_service_date: Mapped[date | None] = mapped_column(Date(), nullable=True)
    estimated_cost_usd: Mapped[float | None] = mapped_column(Float(), nullable=True)
    safe_to_drink: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    boil_water_advisory: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    raw_ai_response: Mapped[str | None] = mapped_column(Text(), nullable=True)

    water_point: Mapped["WaterPoint"] = relationship("WaterPoint", back_populates="treatment_plans")
