export type AssetType =
  | "ROAD_INTERSECTION"
  | "ROAD_SEGMENT"
  | "BRIDGE"
  | "HOSPITAL"
  | "FIRE_STATION"
  | "AMBULANCE_FACILITY"
  | "ELECTRICAL_SUBSTATION"
  | "WATER_PUMPING_STATION"
  | "EMERGENCY_SHELTER"
  | "COMMUNICATION_FACILITY";

export type OperationalState = "NOMINAL" | "DEGRADED" | "FAILED" | "ISOLATED";

export type DependencyType =
  | "PHYSICAL_ROAD"
  | "POWER_GRID"
  | "WATER_SERVICE"
  | "COMMUNICATION"
  | "EMERGENCY_ACCESS";

export interface InfrastructureAsset {
  id: string;
  name: string;
  asset_type: AssetType;
  lat: number;
  lon: number;
  elevation_m: number;
  criticality: number;
  operational_state: OperationalState;
  flood_depth_threshold_cm: number;
  backup_power_hours: number;
  backup_power_remaining_hours: number;
  capacity_units: string;
  total_capacity: number;
  current_load: number;
  upstream_dependencies: string[];
  downstream_dependents: string[];
  metadata: Record<string, any>;
}

export interface InfrastructureDependency {
  id: string;
  source_asset_id: string;
  target_asset_id: string;
  dependency_type: DependencyType;
  is_bidirectional: boolean;
  weight_distance_m: number;
  transit_time_minutes: number;
  failure_threshold: number;
  status: string;
}

export interface InfrastructureGraphData {
  version: string;
  region_name: string;
  center_coordinates: [number, number];
  assets: InfrastructureAsset[];
  dependencies: InfrastructureDependency[];
}

export interface IncidentEvidence {
  id: string;
  source: string;
  timestamp: string;
  text_content: string;
  sensor_reading_cm?: number;
  confidence: number;
}

export interface Incident {
  id: string;
  title: string;
  category: string;
  severity: string;
  epicenter: [number, number];
  radius_meters: number;
  flood_depth_cm: number;
  progression_rate_cm_per_hour: number;
  description: string;
  evidence: IncidentEvidence[];
}

export interface SimulationStepEvent {
  step: number;
  time_offset_hours: number;
  asset_id: string;
  asset_name: string;
  event_type: string;
  description: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export interface StepMetrics {
  step: number;
  time_offset_hours: number;
  affected_assets_count: number;
  critical_facilities_disrupted: number;
  accessible_road_pct: number;
  average_travel_distance_km: number;
  access_delay_proxy_minutes: number;
  dependency_failure_count: number;
  total_weighted_impact: number;
  asset_states: Record<string, OperationalState>;
}

export interface SimulationRunResult {
  simulation_id: string;
  scenario_id: string;
  scenario_name: string;
  parameters: Record<string, any>;
  timeline_steps: StepMetrics[];
  events: SimulationStepEvent[];
  final_metrics: StepMetrics;
  stabilization_reached: boolean;
  execution_duration_ms: number;
  created_at: string;
}

export interface ComparativeEvaluation {
  scenario_id: string;
  scenario_name: string;
  category: string;
  affected_critical_assets: number;
  accessible_road_pct: number;
  access_delay_minutes: number;
  total_impact_score: number;
  composite_rank_score: number;
  rank: number;
  impact_reduction_pct: number;
  resource_cost_index: number;
  feasibility_score: number;
  ranking_rationale: string;
  sensitivity_bounds: Record<string, number>;
}

export interface IntelligenceAnalysisResponse {
  incident_id: string;
  assessed_category: string;
  severity_assessment: string;
  visible_hazards: string[];
  potentially_affected_assets: string[];
  risk_hypotheses: string[];
  plausible_cascades: string[];
  uncertainty_indicators: string[];
  missing_information: string[];
  operational_rationale: string;
  reasoning_summary?: string;
  model_provenance: "LIVE_META_MUSE_SPARK_OPEN" | "VERIFIED_DETERMINISTIC_ENGINE" | "UNAVAILABLE";
  confidence_score: number | null;
  diagnostic_metadata?: Record<string, any>;
}

export interface DecisionBrief {
  brief_id: string;
  incident_id: string;
  generated_at: string;
  recommended_scenario_id: string;
  executive_summary: string;
  key_findings: string[];
  comparative_summary: ComparativeEvaluation[];
  tradeoffs_and_risks: string[];
  assumptions_and_limitations: string[];
  model_provenance: string;
  operator_signoff_required: boolean;
}

export interface SystemHealthResponse {
  status: string;
  version: string;
  model_provider_status: string;
  model_id: string;
  database_status: string;
  uptime_seconds: number;
  total_simulations_run: number;
  timestamp: string;
}

