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
- `POST /intelligence/explain`: Generates chain-of-thought narrative explanation of simulation trade-offs.
