"""ServiceLog model — maintenance records."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.water_point import WaterPoint


class ServiceLog(Base):
    __tablename__ = "service_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    water_point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scheduled_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)
    urgency: Mapped[str] = mapped_column(String(20), nullable=False, default="low")
    triggered_by: Mapped[list[str] | None] = mapped_column(ARRAY(Text()), nullable=True)
    technician: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cost_usd: Mapped[float | None] = mapped_column(Float(), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    before_score: Mapped[float | None] = mapped_column(Float(), nullable=True)
    after_score: Mapped[float | None] = mapped_column(Float(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("NOW()")
    )

    water_point: Mapped["WaterPoint"] = relationship("WaterPoint", back_populates="service_logs")
