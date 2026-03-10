"""Reading model — water quality measurements."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Float, DateTime, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.water_point import WaterPoint


class Reading(Base):
    __tablename__ = "readings"
    __table_args__ = (
        Index("ix_readings_wp_date", "water_point_id", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    water_point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ph: Mapped[float] = mapped_column(Float(), nullable=False)
    tds: Mapped[float] = mapped_column(Float(), nullable=False)
    turbidity: Mapped[float] = mapped_column(Float(), nullable=False)
    fluoride: Mapped[float] = mapped_column(Float(), nullable=False)
    nitrate: Mapped[float] = mapped_column(Float(), nullable=False)
    coliform: Mapped[float] = mapped_column(Float(), nullable=False)
    water_level: Mapped[float | None] = mapped_column(Float(), nullable=True)
    pump_yield: Mapped[float | None] = mapped_column(Float(), nullable=True)
    source: Mapped[str] = mapped_column(String(30), nullable=False, default="manual")
    notes: Mapped[str | None] = mapped_column(Text(), nullable=True)

    water_point: Mapped["WaterPoint"] = relationship("WaterPoint", back_populates="readings")
