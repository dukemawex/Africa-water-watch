"""Initial schema — all tables with PostGIS.

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), primary_key=True),
        sa.Column("email", sa.String(300), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(300), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="community_reporter"),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "water_points",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("location", geoalchemy2.Geometry("POINT", srid=4326), nullable=False),
        sa.Column("depth_m", sa.Float(), nullable=True),
        sa.Column("geology", sa.String(100), nullable=True),
        sa.Column("population", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="safe"),
        sa.Column("quality_score", sa.Float(), nullable=False, server_default="100.0"),
        sa.Column("last_tested", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_serviced", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ndwi", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_water_points_country", "water_points", ["country"])
    op.create_index("ix_water_points_status", "water_points", ["status"])
    op.create_index("ix_water_points_region", "water_points", ["region"])
    op.execute("CREATE INDEX ix_water_points_location ON water_points USING GIST (location);")

    op.create_table(
        "readings",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), primary_key=True),
        sa.Column("water_point_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ph", sa.Float(), nullable=False),
        sa.Column("tds", sa.Float(), nullable=False),
        sa.Column("turbidity", sa.Float(), nullable=False),
        sa.Column("fluoride", sa.Float(), nullable=False),
        sa.Column("nitrate", sa.Float(), nullable=False),
        sa.Column("coliform", sa.Float(), nullable=False),
        sa.Column("water_level", sa.Float(), nullable=True),
        sa.Column("pump_yield", sa.Float(), nullable=True),
        sa.Column("source", sa.String(30), nullable=False, server_default="manual"),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_readings_water_point_id", "readings", ["water_point_id"])
    op.create_index("ix_readings_recorded_at", "readings", ["recorded_at"])
    op.create_index("ix_readings_wp_date", "readings", ["water_point_id", "recorded_at"])

    op.create_table(
        "service_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), primary_key=True),
        sa.Column("water_point_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("service_type", sa.String(50), nullable=False),
        sa.Column("urgency", sa.String(20), nullable=False, server_default="low"),
        sa.Column("triggered_by", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("technician", sa.String(200), nullable=True),
        sa.Column("cost_usd", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("before_score", sa.Float(), nullable=True),
        sa.Column("after_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_service_logs_water_point_id", "service_logs", ["water_point_id"])
    op.create_index("ix_service_logs_status", "service_logs", ["status"])

    op.create_table(
        "treatment_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), primary_key=True),
        sa.Column("water_point_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("ai_model", sa.String(100), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("urgency", sa.String(20), nullable=False),
        sa.Column("immediate_actions", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("treatment_steps", postgresql.JSONB(), nullable=True),
        sa.Column("prevention_tips", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("next_test_date", sa.Date(), nullable=True),
        sa.Column("next_service_date", sa.Date(), nullable=True),
        sa.Column("estimated_cost_usd", sa.Float(), nullable=True),
        sa.Column("safe_to_drink", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("boil_water_advisory", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("raw_ai_response", sa.Text(), nullable=True),
    )
    op.create_index("ix_treatment_plans_water_point_id", "treatment_plans", ["water_point_id"])
    op.create_index("ix_treatment_plans_generated_at", "treatment_plans", ["generated_at"])

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("uuid_generate_v4()"), primary_key=True),
        sa.Column("water_point_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("sms_sent", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sms_recipients", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_alerts_water_point_id", "alerts", ["water_point_id"])
    op.create_index("ix_alerts_severity", "alerts", ["severity"])
    op.create_index("ix_alerts_resolved", "alerts", ["resolved"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_table("treatment_plans")
    op.drop_table("service_logs")
    op.drop_table("readings")
    op.drop_table("water_points")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS postgis;")
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp";')
