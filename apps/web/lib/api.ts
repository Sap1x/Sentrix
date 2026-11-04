import {
  InfrastructureGraphData,
  InfrastructureAsset,
  Incident,
  SimulationRunResult,
  ComparativeEvaluation,
  IntelligenceAnalysisResponse,
  DecisionBrief,
  SystemHealthResponse
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchHealth(): Promise<SystemHealthResponse> {
  const res = await fetch(`${API_BASE}/api/v1/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchGraph(): Promise<InfrastructureGraphData> {
  const res = await fetch(`${API_BASE}/api/v1/infrastructure/graph`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch infrastructure graph: ${res.statusText}`);
  return res.json();
}

export async function fetchAsset(id: string): Promise<InfrastructureAsset> {
  const res = await fetch(`${API_BASE}/api/v1/infrastructure/assets/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch asset ${id}`);
  return res.json();
}

export async function fetchScenarios(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/v1/scenarios`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch scenarios: ${res.statusText}`);
  return res.json();
}

export async function runSimulation(
  incidentId: string = "scenario-flood-central-2026",
  scenarioId: string = "scen-baseline",
  timeHorizonHours: number = 5,
  customParams?: {
    custom_flood_depth_cm?: number;
    custom_progression_rate_cm_per_hour?: number;
    custom_radius_meters?: number;
  }
): Promise<SimulationRunResult> {
  const res = await fetch(`${API_BASE}/api/v1/simulations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      incident_id: incidentId,
      scenario_id: scenarioId,
      time_horizon_hours: timeHorizonHours,
      step_size_hours: 1.0,
      random_seed: 42,
      ...customParams,
    }),
  });
  if (!res.ok) throw new Error(`Simulation failed: ${res.statusText}`);
  return res.json();
}

export async function compareInterventions(
  incidentId: string = "scenario-flood-central-2026",
  customParams?: {
    custom_flood_depth_cm?: number;
    custom_progression_rate_cm_per_hour?: number;
    custom_radius_meters?: number;
    custom_weights?: Record<string, number>;
  }
): Promise<ComparativeEvaluation[]> {
  const res = await fetch(`${API_BASE}/api/v1/interventions/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      incident_id: incidentId,
      scenario_ids: [
        "scen-baseline",
        "scen-road-diversion",
        "scen-substation-barrier",
        "scen-combined-mitigation"
      ],
      ...customParams,
    }),
  });
  if (!res.ok) throw new Error(`Comparison failed: ${res.statusText}`);
  return res.json();
}

export async function fetchIntelligence(
  incidentId: string = "scenario-flood-central-2026"
): Promise<IntelligenceAnalysisResponse> {
  const res = await fetch(`${API_BASE}/api/v1/intelligence/analyze?incident_id=${incidentId}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error(`Intelligence analysis failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDecisionBrief(
  incidentId: string = "scenario-flood-central-2026"
): Promise<DecisionBrief> {
  const res = await fetch(`${API_BASE}/api/v1/decision-brief?incident_id=${incidentId}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error(`Decision brief generation failed: ${res.statusText}`);
  return res.json();
}

