"""
SENTRIX — Pydantic Data Contracts and Domain Models
Provides strict schemas for digital twin assets, dependencies, incidents,
simulations, interventions, and AI model intelligence outputs.
"""
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AssetType(str, Enum):
    ROAD_INTERSECTION = "ROAD_INTERSECTION"
    ROAD_SEGMENT = "ROAD_SEGMENT"
    BRIDGE = "BRIDGE"
    HOSPITAL = "HOSPITAL"
    FIRE_STATION = "FIRE_STATION"
    AMBULANCE_FACILITY = "AMBULANCE_FACILITY"
    ELECTRICAL_SUBSTATION = "ELECTRICAL_SUBSTATION"
    WATER_PUMPING_STATION = "WATER_PUMPING_STATION"
    EMERGENCY_SHELTER = "EMERGENCY_SHELTER"
    COMMUNICATION_FACILITY = "COMMUNICATION_FACILITY"


class OperationalState(str, Enum):
    NOMINAL = "NOMINAL"          # Fully operational
    DEGRADED = "DEGRADED"        # Partial capacity (e.g. backup power, reduced lanes)
    FAILED = "FAILED"            # Fully inoperable / inundated
    ISOLATED = "ISOLATED"        # Asset functional internally, but all physical access severed


class DependencyType(str, Enum):
    PHYSICAL_ROAD = "PHYSICAL_ROAD"          # Transport connectivity
    POWER_GRID = "POWER_GRID"                # Electricity transmission
    WATER_SERVICE = "WATER_SERVICE"          # Water pressure / cooling / firefighting
    COMMUNICATION = "COMMUNICATION"          # Telemetry / dispatch data
    EMERGENCY_ACCESS = "EMERGENCY_ACCESS"    # Dedicated first responder corridor


class InfrastructureAsset(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    asset_type: AssetType
    lat: float
    lon: float
    elevation_m: float
    criticality: int = Field(ge=1, le=5, description="1 (standard) to 5 (vital life-safety facility)")
    operational_state: OperationalState = OperationalState.NOMINAL
    flood_depth_threshold_cm: float = Field(default=30.0, description="Flood level causing direct failure")
    backup_power_hours: float = Field(default=0.0, description="Available duration on diesel generator")
    backup_power_remaining_hours: float = 0.0
    capacity_units: str = "units"
    total_capacity: float = 100.0
    current_load: float = 80.0
    upstream_dependencies: List[str] = Field(default_factory=list)
    downstream_dependents: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InfrastructureDependency(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    source_asset_id: str
    target_asset_id: str
    dependency_type: DependencyType
    is_bidirectional: bool = False
    weight_distance_m: float = 500.0
    transit_time_minutes: float = 3.0
    failure_threshold: float = 1.0
    status: str = "NOMINAL"  # NOMINAL, SEVERED, DEGRADED


class InfrastructureGraphData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    version: str = "2.4.0"
    region_name: str
    center_coordinates: Tuple[float, float]
    assets: List[InfrastructureAsset]
    dependencies: List[InfrastructureDependency]


class IncidentEvidence(BaseModel):
    id: str
    source: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    text_content: str
    sensor_reading_cm: Optional[float] = None
    confidence: float = 0.95


class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    category: str = "URBAN_FLASH_FLOOD"
    severity: str = "CRITICAL"
    epicenter: Tuple[float, float]
    radius_meters: float = 1200.0
    flood_depth_cm: float = 65.0
    progression_rate_cm_per_hour: float = 12.0
    evidence: List[IncidentEvidence] = Field(default_factory=list)
    description: str


class SimulationStepEvent(BaseModel):
    step: int
    time_offset_hours: float
    asset_id: str
    asset_name: str
    event_type: str  # DIRECT_INUNDATION, DEPENDENCY_FAILURE, POWER_EXHAUSTION, ACCESS_SEVERED, INTERVENTION_APPLIED
    description: str
    severity: str  # INFO, WARNING, CRITICAL


class StepMetrics(BaseModel):
    step: int
    time_offset_hours: float
    affected_assets_count: int
    critical_facilities_disrupted: int
    accessible_road_pct: float
    average_travel_distance_km: float
    access_delay_proxy_minutes: float
    dependency_failure_count: int
    total_weighted_impact: float
    asset_states: Dict[str, OperationalState]


class SimulationRunResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    simulation_id: str
    scenario_id: str
    scenario_name: str
    parameters: Dict[str, Any]
    timeline_steps: List[StepMetrics]
    events: List[SimulationStepEvent]
    final_metrics: StepMetrics
    stabilization_reached: bool
    execution_duration_ms: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InterventionAction(BaseModel):
    id: str
    name: str
    target_asset_ids: List[str]
    action_type: str  # ROAD_DIVERSION, FLOOD_BARRIER, BACKUP_DEPLOYMENT, PRIORITY_CORRIDOR
    deployment_delay_hours: float = 0.5
    cost_index: float = Field(ge=1.0, le=10.0, description="Cost factor 1 (low) to 10 (high)")
    parameters: Dict[str, Any] = Field(default_factory=dict)
    description: str


class InterventionScenario(BaseModel):
    id: str
    name: str
    category: str  # BASELINE, TRAFFIC_REROUTE, CRITICAL_ASSET_PROTECTION, COMBINED_MITIGATION
    actions: List[InterventionAction]
    description: str


class ComparativeEvaluation(BaseModel):
    scenario_id: str
    scenario_name: str
    category: str
    affected_critical_assets: int
    accessible_road_pct: float
    access_delay_minutes: float
    total_impact_score: float
    composite_rank_score: float
    rank: int
    impact_reduction_pct: float
    resource_cost_index: float
    feasibility_score: float
    ranking_rationale: str
    sensitivity_bounds: Dict[str, float] = Field(default_factory=dict)


class DecisionBrief(BaseModel):
    brief_id: str
    incident_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    recommended_scenario_id: str
    executive_summary: str
    key_findings: List[str]
    comparative_summary: List[ComparativeEvaluation]
    tradeoffs_and_risks: List[str]
    assumptions_and_limitations: List[str]
    model_provenance: str
    operator_signoff_required: bool = True


class IntelligenceAnalysisResponse(BaseModel):
    incident_id: str
    assessed_category: str
    severity_assessment: str
    visible_hazards: List[str]
    potentially_affected_assets: List[str]
    risk_hypotheses: List[str]
    plausible_cascades: List[str]
    uncertainty_indicators: List[str]
    missing_information: List[str]
    reasoning_summary: str
    model_provenance: str
    confidence_score: float


class SystemHealthResponse(BaseModel):
    status: str
    version: str
    model_provider_status: str
    model_id: str
    database_status: str
    uptime_seconds: float
    total_simulations_run: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)

