"""Seed script — 12 African water points with 30 days of readings each."""
import asyncio
import random
from datetime import datetime, timedelta, timezone

from geoalchemy2.elements import WKTElement
from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
from app.models.water_point import WaterPoint
from app.models.reading import Reading
from app.services.scoring import compute_quality_score, get_status

WATER_POINTS = [
    # Nigeria
    {"name": "Kano City Borehole BH-01", "type": "borehole", "country": "Nigeria", "region": "West Africa",
     "lat": 12.0022, "lng": 8.5920, "depth_m": 85.0, "geology": "Basement Complex", "population": 3200},
    {"name": "Lagos Lagoon Surface Station", "type": "lake", "country": "Nigeria", "region": "West Africa",
     "lat": 6.4698, "lng": 3.5852, "depth_m": None, "geology": "Coastal Sediment", "population": 15000},
    {"name": "Abuja Gwagwa Spring", "type": "spring", "country": "Nigeria", "region": "West Africa",
     "lat": 9.0765, "lng": 7.3986, "depth_m": None, "geology": "Basement Complex", "population": 800},
    # Ghana
    {"name": "Accra Densu River Monitor", "type": "river", "country": "Ghana", "region": "West Africa",
     "lat": 5.7167, "lng": -0.2167, "depth_m": None, "geology": "Alluvial", "population": 25000},
    {"name": "Kumasi Borehole KB-22", "type": "borehole", "country": "Ghana", "region": "West Africa",
     "lat": 6.6885, "lng": -1.6244, "depth_m": 62.0, "geology": "Basement Complex", "population": 1500},
    # Senegal
    {"name": "Dakar Community Piped Point", "type": "piped", "country": "Senegal", "region": "West Africa",
     "lat": 14.7167, "lng": -17.4677, "depth_m": None, "geology": "Coastal Sediment", "population": 4500},
    # South Africa
    {"name": "Johannesburg Vaal Reservoir", "type": "reservoir", "country": "South Africa", "region": "Southern Africa",
     "lat": -26.8956, "lng": 27.9253, "depth_m": None, "geology": "Alluvial", "population": 120000},
    {"name": "Cape Town Theewaterskloof", "type": "reservoir", "country": "South Africa", "region": "Southern Africa",
     "lat": -34.0427, "lng": 19.3271, "depth_m": None, "geology": "Granite", "population": 350000},
    # Zimbabwe
    {"name": "Harare Mazowe River Station", "type": "river", "country": "Zimbabwe", "region": "Southern Africa",
     "lat": -17.3265, "lng": 31.0620, "depth_m": None, "geology": "Basement Complex", "population": 18000},
    {"name": "Bulawayo Rural Borehole BH-44", "type": "borehole", "country": "Zimbabwe", "region": "Southern Africa",
     "lat": -20.1325, "lng": 28.6261, "depth_m": 95.0, "geology": "Dolomite", "population": 950},
    # Zambia
    {"name": "Lusaka Chongwe Borehole", "type": "borehole", "country": "Zambia", "region": "Southern Africa",
     "lat": -15.4166, "lng": 28.2833, "depth_m": 72.0, "geology": "Alluvial", "population": 2100},
    {"name": "Livingstone Zambezi Monitor", "type": "river", "country": "Zambia", "region": "Southern Africa",
     "lat": -17.8618, "lng": 25.8542, "depth_m": None, "geology": "Alluvial", "population": 9500},
]


def _random_reading(base_ph=7.2, base_tds=450, poor=False) -> dict:
    """Generate a realistic water quality reading."""
    rng = random.Random()
    if poor:
        return {
            "ph": round(rng.uniform(5.8, 6.3) if rng.random() > 0.5 else rng.uniform(8.8, 9.5), 2),
            "tds": round(rng.uniform(900, 1500), 1),
            "turbidity": round(rng.uniform(5, 25), 2),
            "fluoride": round(rng.uniform(1.2, 2.8), 3),
            "nitrate": round(rng.uniform(10, 18), 2),
            "coliform": round(rng.uniform(0, 200), 1),
        }
    return {
        "ph": round(base_ph + rng.uniform(-0.4, 0.4), 2),
        "tds": round(base_tds + rng.uniform(-80, 80), 1),
        "turbidity": round(rng.uniform(0.1, 2.5), 2),
        "fluoride": round(rng.uniform(0.1, 0.9), 3),
        "nitrate": round(rng.uniform(0.5, 6.0), 2),
        "coliform": 0.0 if rng.random() > 0.05 else round(rng.uniform(1, 20), 1),
        "water_level": round(rng.uniform(3.0, 15.0), 2) if rng.random() > 0.3 else None,
        "pump_yield": round(rng.uniform(8, 30), 1) if rng.random() > 0.3 else None,
    }


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(WaterPoint))
        if existing.scalars().first():
            print("Database already seeded — skipping.")
            return

        now = datetime.now(timezone.utc)

        for i, wp_data in enumerate(WATER_POINTS):
            point = WaterPoint(
                name=wp_data["name"],
                type=wp_data["type"],
                country=wp_data["country"],
                region=wp_data["region"],
                location=WKTElement(f"POINT({wp_data['lng']} {wp_data['lat']})", srid=4326),
                depth_m=wp_data.get("depth_m"),
                geology=wp_data.get("geology"),
                population=wp_data["population"],
                last_serviced=now - timedelta(days=random.randint(30, 200)),
            )
            db.add(point)
            await db.flush()

            # Generate 30 days of readings
            poor_quality = i % 4 == 3  # every 4th point has poor quality
            readings = []
            for day in range(30, 0, -1):
                r_data = _random_reading(poor=poor_quality)
                r = Reading(
                    water_point_id=point.id,
                    recorded_at=now - timedelta(days=day, hours=random.randint(0, 12)),
                    ph=r_data["ph"],
                    tds=r_data["tds"],
                    turbidity=r_data["turbidity"],
                    fluoride=r_data["fluoride"],
                    nitrate=r_data["nitrate"],
                    coliform=r_data["coliform"],
                    water_level=r_data.get("water_level"),
                    pump_yield=r_data.get("pump_yield"),
                    source="sensor" if i % 2 == 0 else "manual",
                )
                readings.append(r)
                db.add(r)

            await db.flush()

            # Compute quality score from latest reading
            latest = readings[-1]
            score = compute_quality_score(latest)
            point.quality_score = score
            point.status = get_status(score)
            point.last_tested = latest.recorded_at

        await db.commit()
        print(f"Seeded {len(WATER_POINTS)} water points with 30 days of readings each.")


if __name__ == "__main__":
    asyncio.run(seed())
