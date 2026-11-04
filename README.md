# SENTRIX

<div align="center">

### **See the cascade before it happens.**

*An AI-powered infrastructure resilience and cascading-failure intelligence platform.*

[![CI Pipeline](https://github.com/Sap1x/Sentrix/actions/workflows/ci.yml/badge.svg)](https://github.com/Sap1x/Sentrix/actions)
[![Meta Model](https://img.shields.io/badge/Meta_Model-Muse_Spark_Open-4f46e5)](https://inference.baseten.co)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14_App_Router-000000)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 1. Introduction

**SENTRIX** is a multimodal, AI-assisted infrastructure resilience intelligence platform designed for municipal Emergency Operations Centers (EOC), infrastructure authorities, and urban planners. It models how localized incidents propagate across interconnected lifelines (transportation, electrical grids, water supply, and communications) to quantify cascading consequences and evaluate counterfactual interventions before emergency resources are deployed.

- **Product Name:** SENTRIX
- **Tagline:** *See the cascade before it happens.*
- **Primary Hackathon Track:** Indie Developer — **Push the Frontier**
- **Secondary Alignment:** Build for Your World

---

## 2. Problem Statement

A flooded road is not merely a transportation problem. In modern interconnected cities:
- A flooded underpass traps civilian transit and cuts the primary corridor to a Level-1 Trauma Hospital.
- Emergency ambulances face severe transit detours, compromising acute medical response times.
- Floodwaters reach low-elevation distribution substations, tripping electrical breakers.
- Loss of grid power forces hospitals onto emergency diesel generators with limited fuel buffers.
- Water pumping stations lose power, dropping municipal water pressure and degrading hospital sterilization and firefighting capacity.

Emergency commanders and urban operators routinely face the questions:
1. **What breaks next?**
2. **Why does it break?**
3. **What intervention reduces the damage before physical resources are committed?**

---

## 3. Product Vision & Core Features

SENTRIX bridges the gap between high-level AI reasoning and classical infrastructure engineering:

$$\text{Incident Intake} \longrightarrow \text{Infrastructure Digital Twin} \longrightarrow \text{Deterministic Cascade} \longrightarrow \text{Counterfactual Scenarios} \longrightarrow \text{MCDA Decision}$$

### Core Platform Capabilities
1. **Multimodal Incident Understanding:** Ingests sensor data, river streamflow gauges, and paramedic dispatch radio transcripts using Meta's **Muse Spark Open** via Baseten with evidence-grounded risk extraction and operational summaries.
2. **Infrastructure Digital Twin:** Models physical connectivity (road links, bridges) and directed functional lifelines (power grid feeds, water pressure, communications) across 14 assets and 16 lifelines.
3. **Deterministic Cascading-Failure Engine:** Discrete-time simulation engine (implemented in NetworkX) executing hydraulic flood spread, component inundation, backup generator depletion, cycle-safe cascade propagation, and Dijkstra shortest-path transit rerouting.
4. **Dynamic Parametric Calibration:** Operators can adjust initial flood surge depth (30–120cm), progression rate (5–30cm/hr), and surge radius (800–2500m) in real time to simulate evolving storm conditions.
5. **Counterfactual Intervention Analysis:** Evaluates 4 scenarios under identical initial conditions:
   - **Baseline:** Unmitigated disaster progression.
   - **Intervention A (Road Diversion):** Perimeter sealing and activation of an elevated highland emergency transit corridor.
   - **Intervention B (Substation Protection):** Rapid deployment of Tiger Dam flood barriers and dewatering pumps.
   - **Intervention C (Combined Mitigation):** Synchronized multi-vector response.
6. **Multi-Criteria Decision Analysis (MCDA) Ranking & Interactive Presets:** Ranks candidate interventions using transparent, documented objective weights across impact reduction, critical asset protection, road accessibility, access delay, feasibility, and cost proxy, with one-click operational presets (*Balanced*, *Life-Safety Priority*, *Rapid Transit*).
7. **Geospatial Vector Map with Active Detour Overlay:** Dynamic MapLibre-ready SVG map displaying component flood thresholds, inundation extent, and illuminated active ambulance trajectories (direct corridor vs. Northway Ridge bypass).
8. **Audit-Ready Executive Decision Brief:** Synthesizes verified simulation outcomes into an RFC-3339 timestamped operational brief with one-click Markdown copy, JSON export, and mandatory human operator validation sign-off.

---

## 4. Architecture Overview

SENTRIX strictly decouples **qualitative multimodal reasoning** from **quantitative physical computation**:

```
                         Next.js Operations Dashboard
                                      │
                                      ▼
                        FastAPI Application Gateway
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
Multimodal Intake           Deterministic Engine             MCDA Ranking
        │                             │                             │
        ▼                             ▼                             ▼
Meta Muse Spark Open       NetworkX Mixed Graph Twin       Decision Brief Service
 (Baseten Inference)       (Hydraulic & Dijkstra Paths)     (Human Sign-off Audit)
```

- **Meta Model Responsibilities:** Incident understanding, structured hazard extraction, operational synthesis, and qualitative briefing grounded in actual simulation outputs.
- **Simulation Engine Responsibilities:** Inundation depth, component failure states, backup fuel depletion hours, Dijkstra shortest-path transit delay, and impact scoring.

---

## 5. Technology Stack

### Frontend (`apps/web`)
- **Framework:** Next.js 14 (App Router, React 18, TypeScript strict mode)
- **Styling:** Tailwind CSS (Dark, restrained command-center palette)
- **Geospatial & Graph View:** Interactive SVG / MapLibre-ready Vector Engine & Topological Dependency Matrix
- **State & Data Fetching:** TanStack React Query & Server Actions
- **Icons & Telemetry:** Lucide React

### Backend (`apps/api`)
- **Runtime:** Python 3.11+ / FastAPI
- **Data Validation:** Pydantic v2 domain schemas
- **Graph Simulation:** NetworkX (Directed mixed multigraphs, Dijkstra routing)
- **Model Adapter:** HTTPX asynchronous client with bounded retries and exponential backoff
- **Streaming:** Server-Sent Events (SSE) for simulation timeline playback
- **Persistence:** SQLAlchemy 2.0 with PostgreSQL / aiosqlite standalone dev fallback

---

## 6. Meta Model Integration: Muse Spark Open

SENTRIX natively integrates Meta's flagship model:
- **Model Identifier:** `meta-models/muse-spark-open`
- **Inference Gateway:** Baseten (`https://inference.baseten.co/v1`)
- **Authentication:** `Api-Key` authorization header
- **Input Modalities:** Text, sensor telemetry, and incident reports
- **Output:** Strict Pydantic-validated JSON containing:
  - `visible_hazards`: Direct hydraulic risks.
  - `potentially_affected_assets`: Upstream and downstream lifeline nodes.
  - `risk_hypotheses`: Causal failure predictions.
  - `plausible_cascades`: High-probability propagation vectors.
  - `uncertainty_indicators`: Information gaps requiring sensor verification.
  - `operational_rationale`: Operational rationale summary grounded in topology and elevation models.
- **Graceful Degradation:** When Baseten is offline or rate-limited, the system falls back to a deterministic rule-grounded engine, explicitly labeled as `VERIFIED_DETERMINISTIC_ENGINE`. When live, outputs carry the verified provenance `LIVE_META_MUSE_SPARK_OPEN`.

---

## 7. Infrastructure Digital Twin & Simulation Methodology

The digital twin models the **Metropolis Central District** corridor:
- **14 Infrastructure Nodes:**
  - `hospital-st-jude`: Level-1 Trauma Center ($C=5$, $2.0\text{h}$ backup diesel runtime)
  - `hospital-riverfront`: Community Acute Care Pavilion ($C=3$)
  - `substation-north-01`: High-Voltage Distribution Feeder ($C=5$, $30\text{cm}$ trip limit)
  - `substation-west-02`: Industrial Grid Substation ($C=4$)
  - `water-pumping-01`: Rivergate Water Pumping Station ($C=4$, $25\text{cm}$ flood limit)
  - `ems-station-04`: Fire & EMS Paramedic Strike Dispatch ($C=5$)
  - `shelter-civic-arena`: Evacuation Shelter ($C=4$)
  - `telco-tower-central`: 911 Communications Tower ($C=4$)
  - `junction-grand-underpass`: Critical Low-Lying Choke Point (Elevation $2.2\text{m}$, threshold $25\text{cm}$)
  - `junction-northway-ridge`: Highland Emergency Detour Corridor (Elevation $16.5\text{m}$)
  - Bridges and arterial gateways (`junction-4th-ave-bridge`, `junction-hospital-gate`, `junction-market-st`, `junction-riverfront-pkwy`).
- **16 Lifelines & Dependencies:** Road connections, high-voltage power feeds, water service pressure lines, and dispatch communications.

### Discrete-Time Failure Propagation ($T = 0 \to 5\text{ hours}$)
1. **$T+0\text{h}$:** River surge reaches $59.4\text{cm}$ at Grand Avenue Underpass. Roadway impassable to civilian vehicles. Substation North-01 alarms at $27.3\text{cm}$ ($<30\text{cm}$ trip limit).
2. **$T+1\text{h}$:** Underpass completely inundated. Direct $3.5\text{ min}$ ambulance corridor severed. Rivergate Water Pumping Station inundated; water pressure drops, taking hospital sterilization offline.
3. **$T+2\text{h}$:** Without mitigation, Substation North-01 basement floods ($36.1\text{cm}$), tripping feeder breakers. St. Jude Trauma Center switches to emergency backup diesel generators ($2.0\text{h}$ fuel capacity).
4. **$T+4\text{h}$:** St. Jude diesel reserves exhausted. Surgical and life-support operations forced into emergency brownout; surgical capacity drops to $35\%$.

---

## 8. Counterfactual Evaluation & Benchmark Results

All runs executed under identical initial conditions (Surge Depth: $65\text{cm}$, Progression: $14\text{cm/hr}$, Horizon: $5\text{ hours}$):

| Scenario | Impact Score | Impact Reduction | Critical Disrupted | Transit Delay | MCDA Score | Rank |
|---|---|---|---|---|---|---|
| **Combined Mitigation** | **18.84** | **-22.1%** | **4 (0 grid failure)** | **+2.7 min** | **30.5** | **#1 (Recommended)** |
| **Substation Flood Barrier** | **19.65** | **-18.8%** | **4** | **+4.3 min** | **27.9** | **#2** |
| **Road Diversion & Corridor** | **23.39** | **-3.3%** | **5** | **+2.7 min** | **21.6** | **#3** |
| **Baseline (Unmitigated)** | **24.20** | **0.0%** | **5** | **+4.3 min** | **19.0** | **#4** |

### MCDA Scoring Weights
$$U_k = \left( 0.35 \cdot S_{\text{crit}} + 0.30 \cdot S_{\text{impact}} + 0.15 \cdot S_{\text{road}} + 0.10 \cdot S_{\text{delay}} + 0.05 \cdot S_{\text{feas}} + 0.05 \cdot S_{\text{cost}} \right) \times 100$$
- **Sensitivity Analysis:** Perturbing the flood progression rate by $\pm 25\%$ verified that Combined Mitigation remains Rank #1 across all severity conditions ($15.4$ to $23.4$ impact bounds).

---

## 9. Installation & Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ and venv

### 1. Clone & Configure Environment
```bash
git clone https://github.com/Sap1x/Sentrix.git
cd Sentrix

# Create local environment file from template
cp .env.example .env
```
Edit `.env` to supply your Baseten API key:
```env
BASETEN_API_KEY=your_baseten_api_key_here
BASETEN_BASE_URL=https://inference.baseten.co/v1
BASETEN_MODEL_ID=meta-models/muse-spark-open
```

### 2. Start the Backend API
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt

# Start FastAPI server
export PYTHONPATH=apps/api
uvicorn sentrix.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI Swagger docs will be accessible at: `http://localhost:8000/docs`

### 3. Start the Frontend Dashboard
```bash
cd apps/web
npm install
npm run dev
```
Open your browser to: `http://localhost:3000`

---

## 10. Docker Setup

To run the complete platform via Docker Compose:

```bash
# Build and start all services
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Health Endpoint: `http://localhost:8000/api/v1/health`

---

## 11. API Documentation

Key versioned REST endpoints (`/api/v1`):
- `GET /health`: Operational status, Meta Muse Spark Open connectivity ping, database state, uptime.
- `GET /infrastructure/graph`: Returns the complete attributed mixed graph (nodes, coordinates, elevation, dependencies).
- `GET /infrastructure/assets/{asset_id}`: Retrieves specific asset telemetry, thresholds, and backup hours.
- `GET /scenarios`: Lists available municipal disaster scenarios and candidate interventions.
- `POST /simulations`: Executes discrete-time cascading failure simulation over configurable horizon.
- `GET /simulations/{simulation_id}/events`: Server-Sent Events (SSE) stream broadcasting per-step metric shifts.
- `POST /interventions/compare`: Runs multi-scenario simulation and ranks interventions using MCDA.
- `POST /decision-brief`: Synthesizes simulation outcomes into an audit-ready Decision Brief.
- `POST /intelligence/analyze`: Invokes Meta Muse Spark Open for multimodal hazard assessment and structured risk extraction.

See [`docs/api/OPENAPI_SPEC.md`](docs/api/OPENAPI_SPEC.md) for full request/response schemas.

---

## 12. Automated Testing & Verification

SENTRIX includes comprehensive test suites across backend and frontend (100% passing):

```bash
# 1. Run live Meta Muse Spark Open smoke test
source .venv/bin/activate
python3 scripts/smoke_baseten.py

# 2. Run backend pytest suite (17 unit, integration, and contract tests)
pytest tests/unit -v

# 3. Run frontend TypeScript strict check
cd apps/web
npm run typecheck

# 4. Build frontend production bundle
npm run build
```

Full test logs and empirical validation data are detailed in [`docs/VERIFICATION_REPORT.md`](docs/VERIFICATION_REPORT.md).

---

## 13. Comprehensive Engineering Documentation

For deep technical evaluation, the repository includes full production-grade documentation:
- 🏛️ [System Architecture & Specifications](docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`)
- 🔒 [Production Security Review & Threat Assessment](docs/SECURITY_REVIEW.md) (`docs/SECURITY_REVIEW.md`)
- 🧪 [Verification, Test & Benchmark Report](docs/VERIFICATION_REPORT.md) (`docs/VERIFICATION_REPORT.md`)
- 📋 [Engineering Audit & Remediation Matrix](docs/ENGINEERING_AUDIT.md) (`docs/ENGINEERING_AUDIT.md`)
- ⏱️ [3-Minute Live Demonstration Script](docs/DEMO_SCRIPT.md) (`docs/DEMO_SCRIPT.md`)
- 📡 [OpenAPI Specification](docs/api/OPENAPI_SPEC.md) (`docs/api/OPENAPI_SPEC.md`)
- 🌊 [Simulation Methodology](docs/simulation/METHODOLOGY.md) (`docs/simulation/METHODOLOGY.md`)

---

## 13. Security Considerations

- **Zero Credential Exposure:** Secrets reside exclusively in `.env` (gitignored). No API keys are committed or exposed in client bundles.
- **Untrusted Model Output:** AI outputs are treated as untrusted text and validated via Pydantic; never passed into SQL, `eval()`, shell executors, or code dispatchers.
- **Audit Trails:** Every decision brief generates an RFC-3339 timestamped audit record requiring explicit human operator validation sign-off.
- **Least-Privilege Networking:** Frontend communicates exclusively through server-side API routes.

---

## 14. Limitations and Assumptions

- **Simulation Assumptions:** Flood dynamics follow a discrete-time spatial attenuation model with 10-meter digital elevation model (DEM) resolution.
- **Hydraulic Conditions:** Assumes steady stormwater infiltration without catastrophic levee breach.
- **Human Authority:** SENTRIX is strictly a decision-support platform. Real-world physical operations require authorized human incident commander sign-off.

---

## 15. Hackathon Attribution & Licensing

- **Hackathon:** Meta Global AI Developer Hackathon 2026
- **Track:** Indie Developer — Push the Frontier / Build for Your World
- **Author:** Saptarshi Mondal ([Sap1x](https://github.com/Sap1x))
- **License:** Licensed under the [MIT License](LICENSE).
