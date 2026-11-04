# SENTRIX API Specification (v1)

Base URL: `http://localhost:8000/api/v1`

---

## Endpoints Summary

### Health & Telemetry
- `GET /health`: Operational status, Meta Muse Spark Open connectivity ping, database state, uptime.
- `GET /ready`: Digital twin node and edge readiness check.
- `GET /system/metrics`: Active simulations count, cache occupancy, graph asset count.

### Digital Twin
- `GET /infrastructure/graph`: Returns the complete attributed mixed graph (assets, coordinates, elevation, dependencies).
- `GET /infrastructure/assets/{asset_id}`: Retrieves specific asset telemetry, thresholds, and backup hours.

### Incident Management
- `GET /scenarios`: Lists available municipal disaster scenarios and candidate interventions.
- `POST /incidents`: Ingests a new incident report with corroborating sensor evidence.
- `GET /incidents/{incident_id}`: Retrieves incident parameters and epicenter.

### Cascading Simulation & Streaming
- `POST /simulations`: Executes discrete-time cascading failure simulation over configurable horizon.
- `GET /simulations/{simulation_id}`: Retrieves cached simulation timeline metrics and step events.
- `GET /simulations/{simulation_id}/events`: Server-Sent Events (SSE) stream broadcasting per-step metric shifts and critical alerts.

### Counterfactual Interventions
- `POST /interventions/compare`: Runs multi-scenario simulation and ranks interventions using MCDA.
- `POST /decision-brief`: Synthesizes simulation outcomes into an audit-ready Decision Brief with provenance.

### Meta Model Intelligence
- `POST /intelligence/analyze`: Invokes `meta-models/muse-spark-open` for multimodal hazard assessment and structured risk extraction.
- `POST /intelligence/explain`: Generates structured operational narrative explanation of simulation trade-offs.


---

## Schemas & Contracts

### `IntelligenceAnalysisResponse`
```json
{
  "incident_id": "scenario-flood-central-2026",
  "assessed_category": "URBAN_FLASH_FLOOD",
  "severity_assessment": "CRITICAL",
  "visible_hazards": ["string"],
  "potentially_affected_assets": ["string"],
  "risk_hypotheses": ["string"],
  "plausible_cascades": ["string"],
  "uncertainty_indicators": ["string"],
  "missing_information": ["string"],
  "operational_rationale": "Evidence-grounded operational explanation derived from topology and elevation.",
  "reasoning_summary": "Backward-compatible alias of operational_rationale.",
  "model_provenance": "LIVE_META_MUSE_SPARK_OPEN | VERIFIED_DETERMINISTIC_ENGINE | UNAVAILABLE",
  "confidence_score": 0.89,
  "diagnostic_metadata": {
    "failure_category": "AUTHENTICATION_FAILED | RATE_LIMIT_EXCEEDED | UPSTREAM_UNAVAILABLE | UPSTREAM_SERVER_ERROR | REQUEST_TIMEOUT | CONNECTION_ERROR | MALFORMED_JSON | SCHEMA_VALIDATION_ERROR | PROVIDER_UNCONFIGURED",
    "unverified_model_assets": ["string"]
  }
}
```

### Canonical MCDA Weights
All weights must be non-negative, finite numbers. They are normalized to strictly sum to 1.0 across the 6 canonical dimensions:
- `critical_asset_protection`: Default `0.35`
- `impact_reduction`: Default `0.30`
- `road_accessibility`: Default `0.15`
- `access_delay_reduction`: Default `0.10`
- `execution_feasibility`: Default `0.05`
- `cost_efficiency`: Default `0.05`
