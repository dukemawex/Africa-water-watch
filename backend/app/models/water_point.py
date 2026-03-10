"""WaterPoint model with PostGIS geometry column."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Float, Integer, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.database import Base

if TYPE_CHECKING:
    from app.models.reading import Reading
    from app.models.service_log import ServiceLog
    from app.models.treatment_plan import TreatmentPlan
    from app.models.alert import Alert


class WaterPoint(Base):
    __tablename__ = "water_points"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # borehole, river, lake, reservoir, spring, piped
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)  # West Africa / Southern Africa
    location: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    depth_m: Mapped[float | None] = mapped_column(Float(), nullable=True)
    geology: Mapped[str | None] = mapped_column(String(100), nullable=True)
    population: Mapped[int] = mapped_column(Integer(), nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="safe")
    quality_score: Mapped[float] = mapped_column(Float(), nullable=False, default=100.0)
    last_tested: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_serviced: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ndwi: Mapped[float | None] = mapped_column(Float(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )

    readings: Mapped[list["Reading"]] = relationship("Reading", back_populates="water_point", cascade="all, delete-orphan")
    service_logs: Mapped[list["ServiceLog"]] = relationship("ServiceLog", back_populates="water_point", cascade="all, delete-orphan")
    treatment_plans: Mapped[list["TreatmentPlan"]] = relationship("TreatmentPlan", back_populates="water_point", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="water_point", cascade="all, delete-orphan")
