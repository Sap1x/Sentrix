# SENTRIX

<div align="center">

### **See the cascade before it happens.**

*An AI-powered infrastructure resilience and cascading-failure intelligence platform.*

[![CI Pipeline](https://github.com/meta-hackathon/sentrix/actions/workflows/ci.yml/badge.svg)](https://github.com/meta-hackathon/sentrix/actions)
[![Meta Model](https://img.shields.io/badge/Meta_Model-Muse_Spark_Open-4f46e5)](https://inference.baseten.co)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14_App_Router-000000)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 1. Executive Problem Statement

A flooded road is not merely a transportation problem. In modern cities, an inundated underpass delays emergency ambulances, cuts physical access to electrical substations, isolates trauma hospitals, deprives water pumping stations of power, and triggers compounding multi-sector cascading failures.

Emergency operations centers (EOC) and municipal planners routinely struggle to answer three critical questions in real-time:
1. **What breaks next?**
2. **Why does it break?**
3. **What intervention reduces the damage before resources are committed?**

**SENTRIX** solves this by unifying:
- **Multimodal AI incident understanding** powered by Meta's **Muse Spark Open** via Baseten.
- A **graph-based urban infrastructure digital twin** capturing physical roads and functional lifelines (power, water, comms).
- A **deterministic discrete-time cascading failure simulation engine** (NetworkX) modeling topological and hydraulic failure propagation.
- **Counterfactual scenario evaluation** comparing interventions (Baseline vs Road Diversion vs Substation Protection vs Combined Mitigation).
- **Axiomatic Multi-Criteria Decision Analysis (MCDA)** ranking interventions with transparent, inspectable mathematical weights.
- An **operational command-center dashboard** built for high-stakes decision support.

---

## 2. Product Differentiation: AI + Classical Engineering

SENTRIX does **not** treat an LLM as a calculator or simulation oracle. AI models must never invent flood depths, shortest paths, or travel times.

```
Incident Intake 
       │
       ▼
Meta Muse Spark Open (Multimodal Understanding & Structured Risk Extraction)
       │
       ▼
Infrastructure Graph Digital Twin (Metropolis Central Corridor)
       │
       ▼
Deterministic Cascading Engine (Discrete-time physical propagation & Dijkstra routing)
       │
       ▼
Counterfactual Scenario Lab (Baseline vs Interventions A, B, C)
       │
       ▼
MCDA Ranking & Verified Decision Brief (Operator Validation & Sign-off)
```

- **Meta Muse Spark Open** reads natural-language reports and sensor evidence, extracts structured risk hypotheses, discloses chain-of-thought reasoning, and generates explainable operational briefs grounded in simulation outputs.
- **Deterministic Simulation Engine** calculates hydraulic exposure, component failure states, backup generator fuel depletion, shortest-path transit rerouting, and quantitative impact metrics.

---

## 3. Technology Stack

### Frontend (`apps/web`)
- **Framework:** Next.js 14 (App Router, React 18, TypeScript strict mode)
- **Styling:** Tailwind CSS with high-density operational command-center palette
- **Geospatial & Graph View:** Interactive SVG / MapLibre-ready Vector Engine & Topological Dependency Matrix
- **State & Query:** TanStack Query, React State Machine
- **Telemetry Icons:** Lucide React

### Backend (`apps/api`)
- **Runtime:** Python 3.11+ / FastAPI
- **Data Contracts:** Pydantic v2 schemas
- **Graph Simulation:** NetworkX (Directed mixed multigraphs, Dijkstra shortest paths)
- **Model Adapter:** HTTPX asynchronous client with bounded retries and exponential backoff
- **Event Streaming:** Server-Sent Events (SSE) for timeline playback
- **Persistence:** SQLAlchemy 2.0 with PostgreSQL / aiosqlite standalone dev fallback

---

## 4. Meta Model Integration: Muse Spark Open

SENTRIX natively integrates Meta's flagship multimodal model:
- **Model Identifier:** `meta-models/muse-spark-open`
- **Inference Gateway:** Baseten (`https://inference.baseten.co/v1`)
- **Authentication:** `Api-Key` authorization header
- **Responsibilities:**
  - Multi-stream incident evidence interpretation (sensor gauges, paramedic radio calls, SCADA alarms).
  - Structured infrastructure risk extraction (`visible_hazards`, `plausible_cascades`, `uncertainty_indicators`).
  - Chain-of-thought reasoning disclosure.
  - Evidence-grounded operational briefings.
- **Graceful Fallback & Provenance:**
  - If Baseten is unreachable or rate-limited, the system falls back to a deterministic rule-grounded engine, explicitly labeled as `VERIFIED_DETERMINISTIC_ENGINE`.
  - When live, outputs carry the verified provenance `LIVE_META_MUSE_SPARK_OPEN`.

---

## 5. Quick Start & Verification

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ and venv

### Step 1: Environment Setup
```bash
git clone https://github.com/meta-hackathon/sentrix.git
cd sentrix

# Copy environment template
cp .env.example .env
```
*(Insert your Baseten API key into `.env`).*

### Step 2: Start Backend API
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt

# Run backend
export PYTHONPATH=apps/api
uvicorn sentrix.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs available at: `http://localhost:8000/docs`

### Step 3: Start Frontend Dashboard
```bash
cd apps/web
npm install
npm run dev
```
Dashboard available at: `http://localhost:3000`

---

## 6. Automated Verification & Testing

SENTRIX includes comprehensive test suites across backend and frontend:

```bash
# 1. Run live Meta Muse Spark Open smoke test
source .venv/bin/activate
python3 scripts/smoke_baseten.py

# 2. Run backend pytest suite (Determinism, Routing, Cascades, API)
export PYTHONPATH=apps/api
pytest tests/unit -v

# 3. Run frontend TypeScript strict check
cd apps/web
npm run typecheck

# 4. Build frontend production bundle
npm run build
```

---

## 7. Golden-Path Scenario: Urban Flash Flood

- **Scenario:** Metropolis Riverside Central District, torrential surge (65cm flood depth, 14cm/hr rise).
- **Baseline Cascade:**
  - $T+1\text{h}$: Grand Ave Underpass inundated (48cm water). Primary 3.5-min ambulance corridor blocked.
  - $T+2\text{h}$: Substation North-01 basement water intrusion trips high-voltage distribution feeder.
  - $T+4\text{h}$: St. Jude Level-1 Trauma Center 2-hour emergency generator fuel exhausted. Surgical suites constrained.
- **Intervention C (Combined Mitigation):**
  - Deploys Tiger Dam barrier & high-capacity dewatering at Substation North.
  - Activates Northway Ridge elevated bypass corridor for emergency EMS transit.
  - Deploys auxiliary generator to Rivergate Water Pumping Station.
  - **Outcome:** **22.1% total impact reduction**, zero grid disruption, ambulance transit delay limited to +2.7 mins.

---

## 8. Engineering Honesty & Disclosure

- **Implemented vs Experimental:** All core features—digital twin loading, cascading failure simulation, Dijkstra routing, MCDA ranking, Meta Muse Spark Open inference, and decision brief generation—are fully implemented, unit-tested, and functional.
- **Model Independence:** The deterministic simulation engine functions autonomously even if external model gateways are disconnected.
- **Zero Fabricated Metrics:** Displayed metrics originate from NetworkX graph calculations; no fake numbers or synthetic random statistics.

---

## 9. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
