import pytest
from fastapi.testclient import TestClient
from sentrix.main import app

client = TestClient(app)


def test_custom_simulation_parameters():
    """Verify custom flood parameters are respected by simulation engine."""
    res = client.post(
        "/api/v1/simulations",
        json={
            "incident_id": "scenario-flood-central-2026",
            "scenario_id": "scen-baseline",
            "time_horizon_hours": 5,
            "custom_flood_depth_cm": 95.0,
            "custom_progression_rate_cm_per_hour": 22.0,
            "custom_radius_meters": 1800.0,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["parameters"]["incident_id"] == "scenario-flood-central-2026"
    assert data["scenario_id"] == "scen-baseline"
    assert len(data["timeline_steps"]) == 6
    # Higher flood surge depth increases impact compared to nominal 65cm
    assert data["final_metrics"]["total_weighted_impact"] > 30.0


def test_custom_mcda_weights_ranking():
    """Verify custom MCDA weights dynamically adjust scenario scores."""
    # Test with Life-Safety Priority weights
    life_safety_res = client.post(
        "/api/v1/interventions/compare",
        json={
            "incident_id": "scenario-flood-central-2026",
            "scenario_ids": [
                "scen-baseline",
                "scen-road-diversion",
                "scen-substation-barrier",
                "scen-combined-mitigation",
            ],
            "custom_weights": {
                "critical_asset_protection": 0.50,
                "access_delay_reduction": 0.25,
                "impact_reduction": 0.15,
                "road_accessibility": 0.10,
                "execution_feasibility": 0.00,
                "cost_efficiency": 0.00,
            },
        },
    )
    assert life_safety_res.status_code == 200
    evals = life_safety_res.json()
    assert len(evals) == 4
    # Combined mitigation preserves both power to trauma center and access
    assert evals[0]["scenario_id"] == "scen-combined-mitigation"
    assert evals[0]["rank"] == 1


def test_simulation_event_stream():
    """Verify Server-Sent Events (SSE) streaming endpoint."""
    # First create a simulation
    sim_res = client.post(
        "/api/v1/simulations",
        json={
            "incident_id": "scenario-flood-central-2026",
            "scenario_id": "scen-combined-mitigation",
            "time_horizon_hours": 3,
        },
    )
    sim_id = sim_res.json()["simulation_id"]

    # Request SSE stream
    with client.stream("GET", f"/api/v1/simulations/{sim_id}/events") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        lines = []
        for line in response.iter_lines():
            if line:
                lines.append(line)
            if len(lines) >= 3:
                break
        assert any("data:" in l for l in lines)


def test_decision_brief_provenance_and_audit():
    """Verify Decision Brief structure, human validation requirement, and metadata."""
    res = client.post("/api/v1/decision-brief?incident_id=scenario-flood-central-2026")
    assert res.status_code == 200
    brief = res.json()
    assert brief["brief_id"].startswith("brief-")
    assert brief["incident_id"] == "scenario-flood-central-2026"
    assert brief["operator_signoff_required"] is True
    assert len(brief["key_findings"]) >= 3
    assert len(brief["assumptions_and_limitations"]) >= 3
    assert brief["model_provenance"] in ["LIVE_META_MUSE_SPARK_OPEN", "VERIFIED_DETERMINISTIC_ENGINE"]


def test_invalid_weights_api_returns_422():
    """Verify that submitting invalid MCDA weights to compare API returns HTTP 422."""
    # Test unknown key
    res_unknown = client.post(
        "/api/v1/interventions/compare",
        json={
            "incident_id": "scenario-flood-central-2026",
            "custom_weights": {"non_existent_dimension": 0.5}
        }
    )
    assert res_unknown.status_code == 422

    # Test negative weight
    res_neg = client.post(
        "/api/v1/interventions/compare",
        json={
            "incident_id": "scenario-flood-central-2026",
            "custom_weights": {"critical_asset_protection": -0.5}
        }
    )
    assert res_neg.status_code == 422

    # Test all-zero weight
    res_zero = client.post(
        "/api/v1/interventions/compare",
        json={
            "incident_id": "scenario-flood-central-2026",
            "custom_weights": {"critical_asset_protection": 0.0, "impact_reduction": 0.0}
        }
    )
    assert res_zero.status_code == 422


@pytest.mark.asyncio
async def test_intelligence_fallback_provenance():
    """Verify that when external AI provider fails or is unconfigured, fallback provenance is deterministic."""
    from sentrix.intelligence.provider import ModelInferenceProvider
    from sentrix.models.schemas import Incident

    mock_provider = ModelInferenceProvider()
    mock_provider.api_key = ""  # Unconfigure

    test_incident = Incident(
        id="test-inc",
        title="Test Flood",
        category="URBAN_FLASH_FLOOD",
        severity="CRITICAL",
        epicenter=(40.715, -74.009),
        radius_meters=1000.0,
        flood_depth_cm=50.0,
        progression_rate_cm_per_hour=10.0,
        description="Test description",
        evidence=[]
    )

    result = await mock_provider.analyze_incident(test_incident)
    assert result.model_provenance == "VERIFIED_DETERMINISTIC_ENGINE"
    assert len(result.risk_hypotheses) > 0
    assert result.confidence_score is None
    assert result.diagnostic_metadata is not None
    assert result.diagnostic_metadata["failure_category"] == "PROVIDER_UNCONFIGURED"

