"""Water quality scoring engine based on WHO guidelines."""
from app.models.reading import Reading


def compute_quality_score(reading: Reading) -> float:
    """Compute water quality score 0-100 based on WHO parameter thresholds."""
    score = 100.0

    # pH deduction
    if reading.ph < 6.5 or reading.ph > 8.5:
        score -= 20

    # TDS deduction
    if reading.tds > 1000:
        score -= 25
    elif reading.tds > 600:
        score -= 10

    # Turbidity deduction (NTU)
    if reading.turbidity > 4:
        score -= 20
    elif reading.turbidity > 1:
        score -= 5

    # Fluoride deduction (mg/L)
    if reading.fluoride > 1.5:
        score -= 20
    elif reading.fluoride > 1.2:
        score -= 8

    # Nitrate deduction (mg/L) — WHO limit 11.3 mg/L as NO3-N
    if reading.nitrate > 11.3:
        score -= 20
    elif reading.nitrate > 8:
        score -= 8

    # Coliform deduction (CFU/100mL) — zero tolerance
    if reading.coliform > 0:
        score -= 30

    return max(0.0, score)


def get_status(score: float) -> str:
    """Convert quality score to status label."""
    if score >= 70:
        return "safe"
    elif score >= 40:
        return "warning"
    return "danger"
