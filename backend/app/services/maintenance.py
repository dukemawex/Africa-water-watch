"""Maintenance rules engine — assesses water points for service needs."""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.water_point import WaterPoint
    from app.models.reading import Reading
    from app.models.service_log import ServiceLog


URGENCY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}
URGENCY_FROM_RANK = {v: k for k, v in URGENCY_RANK.items()}

COST_BY_TYPE = {
    "borehole": 150.0,
    "river": 80.0,
    "lake": 80.0,
    "reservoir": 80.0,
    "spring": 60.0,
    "piped": 100.0,
}


@dataclass
class ServiceAssessment:
    urgency_level: str | None
    days_until_due: int
    triggered_by: list[str] = field(default_factory=list)
    recommended_date: datetime | None = None
    estimated_cost_usd: float = 0.0


def _days_since(dt: datetime | None) -> float:
    if dt is None:
        return float("inf")
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (now - dt).total_seconds() / 86400


def assess_service_need(
    water_point: "WaterPoint",
    readings: list["Reading"],
    service_logs: list["ServiceLog"],
) -> ServiceAssessment:
    """Evaluate all maintenance rules and return a ServiceAssessment."""
    triggered: list[tuple[str, str]] = []  # (label, urgency)

    days_since_service = _days_since(water_point.last_serviced)

    # RULE_01: >180 days since last service
    if days_since_service > 180:
        triggered.append(("Routine 6-month service overdue", "medium"))

    # RULE_02: >90 days since last service (lower priority than RULE_01)
    elif days_since_service > 90:
        triggered.append(("Service due within 90 days", "low"))

    # Sort readings by recorded_at descending (newest first)
    sorted_readings = sorted(readings, key=lambda r: r.recorded_at, reverse=True)

    # RULE_03: turbidity >4 NTU in last 3 consecutive readings
    if len(sorted_readings) >= 3 and all(r.turbidity > 4 for r in sorted_readings[:3]):
        triggered.append(("Sustained high turbidity", "high"))

    # RULE_04: coliform >0 in any reading in last 7 days
    now = datetime.now(timezone.utc)
    recent_7d = [
        r for r in sorted_readings
        if (now - (r.recorded_at if r.recorded_at.tzinfo else r.recorded_at.replace(tzinfo=timezone.utc))).days <= 7
    ]
    if any(r.coliform > 0 for r in recent_7d):
        triggered.append(("Coliform bacteria detected", "critical"))

    # RULE_05: TDS increased >20% vs baseline (first 3 readings)
    oldest_3 = sorted(readings, key=lambda r: r.recorded_at)[:3]
    if len(oldest_3) == 3 and len(sorted_readings) > 3:
        baseline_tds = sum(r.tds for r in oldest_3) / 3
        latest_tds = sorted_readings[0].tds
        if baseline_tds > 0 and latest_tds > baseline_tds * 1.20:
            triggered.append(("TDS spike above baseline", "high"))

    # RULE_06: pH outside 6.5-8.5 in last 2 consecutive readings
    if len(sorted_readings) >= 2 and all(
        r.ph < 6.5 or r.ph > 8.5 for r in sorted_readings[:2]
    ):
        triggered.append(("pH out of safe range", "high"))

    # RULE_07: nitrate >11.3 in any reading in last 14 days
    recent_14d = [
        r for r in sorted_readings
        if (now - (r.recorded_at if r.recorded_at.tzinfo else r.recorded_at.replace(tzinfo=timezone.utc))).days <= 14
    ]
    if any(r.nitrate > 11.3 for r in recent_14d):
        triggered.append(("Nitrate above WHO limit", "critical"))

    # RULE_08: fluoride >1.5 in any reading
    if any(r.fluoride > 1.5 for r in sorted_readings):
        triggered.append(("Fluoride above WHO limit", "high"))

    # RULE_09: pump_yield dropped >30% vs baseline — boreholes only
    if water_point.type == "borehole":
        yields = [r.pump_yield for r in readings if r.pump_yield is not None]
        if len(yields) >= 4:
            baseline_yield = sum(yields[:3]) / 3
            latest_yield = yields[-1]
            if baseline_yield > 0 and latest_yield < baseline_yield * 0.70:
                triggered.append(("Pump yield declined", "high"))

    # RULE_10: water_level dropped >40% of seasonal expected range
    levels = [r.water_level for r in readings if r.water_level is not None]
    if len(levels) >= 4:
        max_level = max(levels)
        min_level = min(levels)
        expected_range = max_level - min_level
        if expected_range > 0:
            latest_level = levels[-1]
            drop_from_max = max_level - latest_level
            if drop_from_max > expected_range * 0.40:
                triggered.append(("Water level critically low", "medium"))

    if not triggered:
        return ServiceAssessment(
            urgency_level=None,
            days_until_due=max(0, 180 - int(days_since_service)),
            triggered_by=[],
            recommended_date=None,
            estimated_cost_usd=COST_BY_TYPE.get(water_point.type, 80.0),
        )

    labels = [t[0] for t in triggered]
    urgencies = [t[1] for t in triggered]

    # Escalation: 2+ high rules → critical
    high_count = sum(1 for u in urgencies if u == "high")
    max_urgency_rank = max(URGENCY_RANK[u] for u in urgencies)
    if high_count >= 2:
        max_urgency_rank = max(max_urgency_rank, URGENCY_RANK["critical"])

    final_urgency = URGENCY_FROM_RANK[max_urgency_rank]

    from datetime import timedelta
    days_overdue = max(0, int(days_since_service) - 90)
    recommended = now + timedelta(days=3 if final_urgency == "critical" else 7 if final_urgency == "high" else 14)

    return ServiceAssessment(
        urgency_level=final_urgency,
        days_until_due=-days_overdue,
        triggered_by=labels,
        recommended_date=recommended,
        estimated_cost_usd=COST_BY_TYPE.get(water_point.type, 80.0),
    )
