"""Alert model — critical water quality alerts."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.water_point import WaterPoint


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    water_point_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False, index=True
    )
    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # critical, warning, info
    message: Mapped[str] = mapped_column(Text(), nullable=False)
    sms_sent: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    sms_recipients: Mapped[list[str] | None] = mapped_column(ARRAY(Text()), nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("NOW()")
    )

    water_point: Mapped["WaterPoint"] = relationship("WaterPoint", back_populates="alerts")
