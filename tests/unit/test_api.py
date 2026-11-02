"""
Unit Tests for SENTRIX REST APIs
Verifies health, graph endpoints, simulations, comparisons, and intelligence.
"""
import pytest
from fastapi.testclient import TestClient
from sentrix.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "model_provider_status" in data


def test_ready_endpoint():
    res = client.get("/api/v1/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "READY"
    assert data["assets_count"] >= 10


def test_infrastructure_graph():
    res = client.get("/api/v1/infrastructure/graph")
    assert res.status_code == 200
    data = res.json()
    assert len(data["assets"]) >= 10
    assert len(data["dependencies"]) >= 10


def test_asset_detail():
    res = client.get("/api/v1/infrastructure/assets/hospital-st-jude")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "hospital-st-jude"
    assert data["criticality"] == 5


def test_run_simulation():
    req = {
        "incident_id": "scenario-flood-central-2026",
        "scenario_id": "scen-baseline",
        "time_horizon_hours": 3,
        "step_size_hours": 1.0,
        "random_seed": 42
    }
    res = client.post("/api/v1/simulations", json=req)
    assert res.status_code == 200
    data = res.json()
    assert "simulation_id" in data
    assert len(data["timeline_steps"]) == 4
    assert data["final_metrics"]["affected_assets_count"] > 0


def test_compare_interventions():
    req = {
        "incident_id": "scenario-flood-central-2026",
        "scenario_ids": [
            "scen-baseline",
            "scen-road-diversion",
            "scen-substation-barrier",
            "scen-combined-mitigation"
        ]
    }
    res = client.post("/api/v1/interventions/compare", json=req)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 4
    assert data[0]["rank"] == 1


def test_intelligence_analyze():
    res = client.post("/api/v1/intelligence/analyze?incident_id=scenario-flood-central-2026")
    assert res.status_code == 200
    data = res.json()
    assert "risk_hypotheses" in data
    assert len(data["risk_hypotheses"]) > 0
    assert "model_provenance" in data


def test_decision_brief():
    res = client.post("/api/v1/decision-brief?incident_id=scenario-flood-central-2026")
    assert res.status_code == 200
    data = res.json()
    assert "brief_id" in data
    assert "executive_summary" in data
    assert data["operator_signoff_required"] is True
