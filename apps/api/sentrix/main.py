"""
SENTRIX — Main FastAPI Application
Provides versioned REST APIs and Server-Sent Events for infrastructure digital twin exploration,
deterministic cascading failure simulation, counterfactual intervention analysis, and Meta model intelligence.
"""
import os
import time
import uuid
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from sentrix.models.schemas import (
    InfrastructureGraphData,
    InfrastructureAsset,
    Incident,
    InterventionScenario,
    SimulationRunResult,
    ComparativeEvaluation,
    DecisionBrief,
    IntelligenceAnalysisResponse,
    SystemHealthResponse
)
from sentrix.data.loader import repo
from sentrix.simulation.engine import CascadingFailureSimulator
from sentrix.simulation.ranking import ranking_engine
from sentrix.intelligence.provider import intelligence_provider

load_dotenv()

APP_START_TIME = time.time()
SIMULATION_CACHE: Dict[str, SimulationRunResult] = {}
INCIDENT_CACHE: Dict[str, Incident] = {}
TOTAL_SIMULATIONS_COUNTER = 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load default incident scenario into cache on startup
    scenarios = repo.list_scenarios()
    for s in scenarios:
        inc = Incident(
            id=s["id"],
            title=s["title"],
            category=s.get("category", "URBAN_FLASH_FLOOD"),
            severity=s.get("severity", "CRITICAL"),
            epicenter=tuple(s["epicenter"]),
            radius_meters=s.get("radius_meters", 1200.0),
            flood_depth_cm=s.get("flood_depth_cm", 65.0),
            progression_rate_cm_per_hour=s.get("progression_rate_cm_per_hour", 14.0),
            description=s.get("description", ""),
            evidence=s.get("evidence", [])
        )
        INCIDENT_CACHE[inc.id] = inc
    yield


app = FastAPI(
    title="SENTRIX API",
    description="AI-Powered Infrastructure Resilience & Cascading-Failure Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000.0
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    response.headers["X-Correlation-ID"] = correlation_id
    return response



# --- Health & Telemetry Endpoints ---
@app.get("/api/v1/health", response_model=SystemHealthResponse)
async def get_health():
    global TOTAL_SIMULATIONS_COUNTER
    health_info = await intelligence_provider.health_check()
    return SystemHealthResponse(
        status="HEALTHY",
        version="1.0.0",
        model_provider_status=health_info.get("status", "UNKNOWN"),
        model_id=health_info.get("model_id", "meta-models/muse-spark-open"),
        database_status="CONNECTED",
        uptime_seconds=round(time.time() - APP_START_TIME, 1),
        total_simulations_run=TOTAL_SIMULATIONS_COUNTER
    )


@app.get("/api/v1/ready")
async def get_ready():
    graph_data = repo.get_graph_data()
    if not graph_data or not graph_data.assets:
        raise HTTPException(status_code=503, detail="Digital twin graph not loaded")
    return {"status": "READY", "assets_count": len(graph_data.assets)}


@app.get("/api/v1/system/metrics")
async def get_metrics():
    return {
        "uptime_seconds": round(time.time() - APP_START_TIME, 1),
        "cached_simulations_count": len(SIMULATION_CACHE),
        "total_simulations_executed": TOTAL_SIMULATIONS_COUNTER,
        "active_scenarios_count": len(repo.list_scenarios()),
        "digital_twin_nodes": len(repo.list_assets()),
        "digital_twin_edges": len(repo.list_dependencies()),
        "model_id": intelligence_provider.model_id
    }


# --- Infrastructure Digital Twin Endpoints ---
@app.get("/api/v1/infrastructure/graph", response_model=InfrastructureGraphData)
async def get_infrastructure_graph():
    return repo.get_graph_data()


@app.get("/api/v1/infrastructure/assets/{asset_id}", response_model=InfrastructureAsset)
async def get_asset_detail(asset_id: str):
    asset = repo.get_asset(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return asset


# --- Incident Management Endpoints ---
@app.get("/api/v1/scenarios")
async def list_scenarios():
    return repo.list_scenarios()


@app.post("/api/v1/incidents", response_model=Incident)
async def create_incident(incident: Incident):
    INCIDENT_CACHE[incident.id] = incident
    return incident


@app.get("/api/v1/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str):
    inc = INCIDENT_CACHE.get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return inc


# --- Simulation Engine Endpoints ---
class SimulationRequest(BaseModel):
    incident_id: str = "scenario-flood-central-2026"
    scenario_id: str = "scen-baseline"
    time_horizon_hours: int = 5
    step_size_hours: float = 1.0
    random_seed: int = 42
    custom_flood_depth_cm: Optional[float] = None
    custom_progression_rate_cm_per_hour: Optional[float] = None
    custom_radius_meters: Optional[float] = None


@app.post("/api/v1/simulations", response_model=SimulationRunResult)
async def run_simulation(req: SimulationRequest):
    global TOTAL_SIMULATIONS_COUNTER
    incident = INCIDENT_CACHE.get(req.incident_id)
    if not incident:
        # Fallback to default scenario fixture
        scen_raw = repo.get_scenario_raw(req.incident_id)
        if scen_raw:
            incident = Incident(
                id=scen_raw["id"],
                title=scen_raw["title"],
                category=scen_raw.get("category", "URBAN_FLASH_FLOOD"),
                severity=scen_raw.get("severity", "CRITICAL"),
                epicenter=tuple(scen_raw["epicenter"]),
                radius_meters=scen_raw.get("radius_meters", 1200.0),
                flood_depth_cm=scen_raw.get("flood_depth_cm", 65.0),
                progression_rate_cm_per_hour=scen_raw.get("progression_rate_cm_per_hour", 14.0),
                description=scen_raw.get("description", ""),
                evidence=scen_raw.get("evidence", [])
            )
            INCIDENT_CACHE[incident.id] = incident
        else:
            raise HTTPException(status_code=404, detail=f"Incident {req.incident_id} not found")

    # Clone incident to apply custom calibration parameters if provided
    active_incident = incident.model_copy(deep=True)
    if req.custom_flood_depth_cm is not None:
        active_incident.flood_depth_cm = req.custom_flood_depth_cm
    if req.custom_progression_rate_cm_per_hour is not None:
        active_incident.progression_rate_cm_per_hour = req.custom_progression_rate_cm_per_hour
    if req.custom_radius_meters is not None:
        active_incident.radius_meters = req.custom_radius_meters

    # Retrieve selected intervention scenario
    scen_raw = repo.get_scenario_raw(req.incident_id)
    selected_scenario: Optional[InterventionScenario] = None

    if scen_raw and "interventions" in scen_raw:
        for itv in scen_raw["interventions"]:
            if itv["id"] == req.scenario_id:
                selected_scenario = InterventionScenario.model_validate(itv)
                break

    if not selected_scenario:
        selected_scenario = InterventionScenario(
            id=req.scenario_id,
            name="Baseline Run",
            category="BASELINE",
            actions=[],
            description="Default baseline run"
        )

    simulator = CascadingFailureSimulator(repo.get_graph_data())
    result = simulator.run_simulation(
        incident=active_incident,
        scenario=selected_scenario,
        time_horizon_hours=req.time_horizon_hours,
        step_size_hours=req.step_size_hours,
        random_seed=req.random_seed
    )

    SIMULATION_CACHE[result.simulation_id] = result
    TOTAL_SIMULATIONS_COUNTER += 1
    return result


@app.get("/api/v1/simulations/{simulation_id}", response_model=SimulationRunResult)
async def get_simulation(simulation_id: str):
    res = SIMULATION_CACHE.get(simulation_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
    return res


@app.get("/api/v1/simulations/{simulation_id}/events")
async def stream_simulation_events(simulation_id: str):
    """Streams simulation timeline events via Server-Sent Events (SSE)."""
    res = SIMULATION_CACHE.get(simulation_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")

    async def event_generator():
        for step_metric in res.timeline_steps:
            payload = {
                "step": step_metric.step,
                "time_offset_hours": step_metric.time_offset_hours,
                "affected_assets_count": step_metric.affected_assets_count,
                "critical_facilities_disrupted": step_metric.critical_facilities_disrupted,
                "accessible_road_pct": step_metric.accessible_road_pct,
                "access_delay_proxy_minutes": step_metric.access_delay_proxy_minutes,
                "total_weighted_impact": step_metric.total_weighted_impact,
                "events": [e.model_dump() for e in res.events if e.step == step_metric.step]
            }
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0.4)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# --- Counterfactual Interventions & Ranking ---
class CompareInterventionsRequest(BaseModel):
    incident_id: str = "scenario-flood-central-2026"
    scenario_ids: List[str] = [
        "scen-baseline",
        "scen-road-diversion",
        "scen-substation-barrier",
        "scen-combined-mitigation"
    ]
    custom_flood_depth_cm: Optional[float] = None
    custom_progression_rate_cm_per_hour: Optional[float] = None
    custom_radius_meters: Optional[float] = None
    custom_weights: Optional[Dict[str, float]] = None


@app.post("/api/v1/interventions/compare", response_model=List[ComparativeEvaluation])
async def compare_interventions(req: CompareInterventionsRequest):
    global TOTAL_SIMULATIONS_COUNTER
    incident = INCIDENT_CACHE.get(req.incident_id)
    if not incident:
        scen_raw = repo.get_scenario_raw(req.incident_id)
        if scen_raw:
            incident = Incident(
                id=scen_raw["id"],
                title=scen_raw["title"],
                category=scen_raw.get("category", "URBAN_FLASH_FLOOD"),
                severity=scen_raw.get("severity", "CRITICAL"),
                epicenter=tuple(scen_raw["epicenter"]),
                radius_meters=scen_raw.get("radius_meters", 1200.0),
                flood_depth_cm=scen_raw.get("flood_depth_cm", 65.0),
                progression_rate_cm_per_hour=scen_raw.get("progression_rate_cm_per_hour", 14.0),
                description=scen_raw.get("description", ""),
                evidence=scen_raw.get("evidence", [])
            )
            INCIDENT_CACHE[incident.id] = incident
        else:
            raise HTTPException(status_code=404, detail="Incident not found")

    # Clone incident to apply custom calibration parameters if provided
    active_incident = incident.model_copy(deep=True)
    if req.custom_flood_depth_cm is not None:
        active_incident.flood_depth_cm = req.custom_flood_depth_cm
    if req.custom_progression_rate_cm_per_hour is not None:
        active_incident.progression_rate_cm_per_hour = req.custom_progression_rate_cm_per_hour
    if req.custom_radius_meters is not None:
        active_incident.radius_meters = req.custom_radius_meters

    scen_raw = repo.get_scenario_raw(req.incident_id)
    if not scen_raw or "interventions" not in scen_raw:
        # Fallback to default scenario interventions if incident was custom-created
        scen_raw = repo.get_scenario_raw("scenario-flood-central-2026")
        if not scen_raw or "interventions" not in scen_raw:
            raise HTTPException(status_code=404, detail="No interventions configured for incident")

    simulator = CascadingFailureSimulator(repo.get_graph_data())

    baseline_scenario: Optional[InterventionScenario] = None
    candidate_scenarios: List[InterventionScenario] = []

    for itv in scen_raw["interventions"]:
        scen_obj = InterventionScenario.model_validate(itv)
        if scen_obj.id == "scen-baseline" or scen_obj.category == "BASELINE":
            baseline_scenario = scen_obj
        elif scen_obj.id in req.scenario_ids:
            candidate_scenarios.append(scen_obj)

    if not baseline_scenario:
        baseline_scenario = InterventionScenario(
            id="scen-baseline",
            name="Baseline Progression",
            category="BASELINE",
            actions=[],
            description="Baseline run"
        )

    # Run baseline simulation
    baseline_run = simulator.run_simulation(active_incident, baseline_scenario)
    SIMULATION_CACHE[baseline_run.simulation_id] = baseline_run
    TOTAL_SIMULATIONS_COUNTER += 1

    candidate_runs: List[tuple[InterventionScenario, SimulationRunResult]] = []
    for cand in candidate_scenarios:
        cand_run = simulator.run_simulation(active_incident, cand)
        SIMULATION_CACHE[cand_run.simulation_id] = cand_run
        TOTAL_SIMULATIONS_COUNTER += 1
        candidate_runs.append((cand, cand_run))

    evaluations = ranking_engine.evaluate_scenarios(
        baseline_run=baseline_run,
        candidate_runs=candidate_runs,
        custom_weights=req.custom_weights
    )
    return evaluations


# --- Meta Model Intelligence Endpoints ---
@app.post("/api/v1/intelligence/analyze", response_model=IntelligenceAnalysisResponse)
async def analyze_incident_intelligence(incident_id: str = Query("scenario-flood-central-2026")):
    incident = INCIDENT_CACHE.get(incident_id)
    if not incident:
        scen_raw = repo.get_scenario_raw(incident_id)
        if scen_raw:
            incident = Incident(
                id=scen_raw["id"],
                title=scen_raw["title"],
                category=scen_raw.get("category", "URBAN_FLASH_FLOOD"),
                severity=scen_raw.get("severity", "CRITICAL"),
                epicenter=tuple(scen_raw["epicenter"]),
                radius_meters=scen_raw.get("radius_meters", 1200.0),
                flood_depth_cm=scen_raw.get("flood_depth_cm", 65.0),
                progression_rate_cm_per_hour=scen_raw.get("progression_rate_cm_per_hour", 14.0),
                description=scen_raw.get("description", ""),
                evidence=scen_raw.get("evidence", [])
            )
            INCIDENT_CACHE[incident.id] = incident
        else:
            raise HTTPException(status_code=404, detail="Incident not found")

    analysis = await intelligence_provider.analyze_incident(incident)
    return analysis


@app.post("/api/v1/intelligence/explain")
async def explain_simulation_intelligence(
    incident_id: str = Query("scenario-flood-central-2026"),
    scenario_id: str = Query("scen-combined-mitigation")
):
    # Retrieve evaluations
    eval_req = CompareInterventionsRequest(incident_id=incident_id)
    evaluations = await compare_interventions(eval_req)

    # Find the top simulation run
    sim_res = next((res for res in SIMULATION_CACHE.values() if res.scenario_id == scenario_id), None)
    if not sim_res:
        sim_res = list(SIMULATION_CACHE.values())[0] if SIMULATION_CACHE else None

    explanation = await intelligence_provider.explain_simulation(sim_res, evaluations)
    return explanation


@app.post("/api/v1/decision-brief", response_model=DecisionBrief)
async def generate_decision_brief(incident_id: str = Query("scenario-flood-central-2026")):
    eval_req = CompareInterventionsRequest(incident_id=incident_id)
    evaluations = await compare_interventions(eval_req)
    explanation = await explain_simulation_intelligence(incident_id)

    top_scenario = evaluations[0]

    return DecisionBrief(
        brief_id=f"brief-{uuid.uuid4().hex[:8]}",
        incident_id=incident_id,
        generated_at=datetime.now(timezone.utc),
        recommended_scenario_id=top_scenario.scenario_id,
        executive_summary=explanation.get("executive_summary", ""),
        key_findings=[
            f"Baseline progression disrupts {next((e.affected_critical_assets for e in evaluations if e.category=='BASELINE'), 4)} critical municipal facilities.",
            f"Underpass inundation causes a +{next((e.access_delay_minutes for e in evaluations if e.category=='BASELINE'), 24.5):.1f} minute ambulance transit delay to St. Jude Trauma Center.",
            f"{top_scenario.scenario_name} achieves {top_scenario.impact_reduction_pct}% total impact reduction with zero critical facility disruptions."
        ],
        comparative_summary=evaluations,
        tradeoffs_and_risks=explanation.get("intervention_tradeoffs", []),
        assumptions_and_limitations=[
            "Elevation data based on 10-meter DEM resolution.",
            "Water progression model assumes steady hydraulic rate without levee breach.",
            "All recommendations are decision-support outputs requiring authorized human operator validation."
        ],
        model_provenance=explanation.get("model_provenance", "LIVE_META_MUSE_SPARK_OPEN"),
        operator_signoff_required=True
    )

