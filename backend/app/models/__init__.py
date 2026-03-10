"""SQLAlchemy models package — import all for Alembic to detect."""
from app.database import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.water_point import WaterPoint  # noqa: F401
from app.models.reading import Reading  # noqa: F401
from app.models.service_log import ServiceLog  # noqa: F401
from app.models.treatment_plan import TreatmentPlan  # noqa: F401
from app.models.alert import Alert  # noqa: F401

__all__ = ["Base", "User", "WaterPoint", "Reading", "ServiceLog", "TreatmentPlan", "Alert"]
