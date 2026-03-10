# AquaWatch Africa 🌊

A production-grade water quality monitoring platform for West Africa (Nigeria, Ghana, Senegal) and Southern Africa (South Africa, Zimbabwe, Zambia). Monitors boreholes, surface water (rivers, lakes, reservoirs), and rural community water points.

## Features

- **Real-time water quality monitoring** — Track pH, TDS, turbidity, fluoride, nitrate, coliform
- **Interactive map** — Leaflet.js map with Sentinel-2 satellite overlay
- **AI-powered analysis** — OpenRouter API (Gemma + Llama fallback) for treatment recommendations
- **Maintenance queue** — Automated rule-based service scheduling with 10 trigger rules
- **SMS alerts** — Africa's Talking API for critical contamination notifications
- **Satellite data** — Copernicus Sentinel-2 NDWI and turbidity indices
- **PWA support** — Offline-capable for 2G mobile users
- **Multi-language** — English, French, Hausa, Swahili

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v3 |
| Backend | FastAPI Python 3.11 + SQLAlchemy async + Alembic |
| Database | PostgreSQL 15 + PostGIS |
| Cache | Redis 7 |
| AI | OpenRouter API (google/gemma-3-12b-it:free → meta-llama/llama-3.1-8b-instruct:free) |
| Maps | Leaflet.js + React-Leaflet |
| Charts | Recharts |
| Auth | JWT python-jose + bcrypt |
| SMS | Africa's Talking API |
| Deploy | Docker Compose + DigitalOcean App Platform |
| CI/CD | GitHub Actions |
| State | Zustand |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### Local Development

```bash
# 1. Clone and configure
cp .env.example .env
# Fill in your API keys in .env

# 2. Start all services
docker-compose up -d

# 3. Run database migrations
docker-compose exec backend alembic upgrade head

# 4. Seed sample data
docker-compose exec backend python -m app.seeds

# 5. Access the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Project Structure

```
aquawatch-africa/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models (PostGIS)
│   │   ├── schemas/         # Pydantic v2 validation
│   │   ├── routers/         # FastAPI endpoint handlers
│   │   ├── services/        # Business logic
│   │   │   ├── scoring.py   # WHO-based quality scoring
│   │   │   ├── maintenance.py # 10 trigger rules
│   │   │   ├── openrouter.py  # AI integration
│   │   │   ├── satellite.py   # Sentinel-2 data
│   │   │   ├── sms.py         # Africa's Talking
│   │   │   └── scheduler.py   # APScheduler jobs
│   │   └── seeds.py         # 12 water points × 30 days data
│   └── alembic/             # Database migrations
└── frontend/
    └── src/
        ├── components/      # React components
        ├── pages/           # Route pages
        ├── store/           # Zustand state
        └── api/             # Axios API clients
```

## Water Quality Scoring

| Parameter | WHO Limit | Deduction |
|-----------|-----------|-----------|
| pH | 6.5 – 8.5 | -20 if outside range |
| TDS | 1000 mg/L | -25 if >1000, -10 if >600 |
| Turbidity | 4 NTU | -20 if >4, -5 if >1 |
| Fluoride | 1.5 mg/L | -20 if >1.5, -8 if >1.2 |
| Nitrate | 11.3 mg/L | -20 if >11.3, -8 if >8 |
| Coliform | 0 CFU/100mL | -30 if detected |

**Status**: Safe ≥70 · Warning ≥40 · Danger <40

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/water-points` | List all water points |
| GET | `/api/water-points/nearby?lat&lng&radius_km` | Spatial search |
| POST | `/api/readings` | Submit water quality reading |
| GET | `/api/maintenance/queue` | Service maintenance queue |
| POST | `/api/maintenance/treatment-plan/{id}` | Generate AI treatment plan |
| POST | `/api/ai/analyze` | Stream AI analysis (SSE) |
| POST | `/api/ai/chat` | Multi-turn AI chat (SSE) |
| GET | `/api/satellite/{id}` | Satellite indices |
| GET | `/health` | Health check |

## Environment Variables

See [`.env.example`](.env.example) for all required variables with descriptions.

## Deployment

### DigitalOcean App Platform

```bash
# Install doctl
brew install doctl
doctl auth init

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

GitHub Actions automatically deploys on push to `main` via `.github/workflows/deploy.yml`.

## Countries Covered

**West Africa**: Nigeria 🇳🇬 · Ghana 🇬🇭 · Senegal 🇸🇳

**Southern Africa**: South Africa 🇿🇦 · Zimbabwe 🇿🇼 · Zambia 🇿🇲

## License

MIT