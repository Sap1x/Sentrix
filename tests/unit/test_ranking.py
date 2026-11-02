"""
Unit Tests for SENTRIX Intervention Ranking Engine
Verifies MCDA scoring, normalization, ranking order, and sensitivity bounds.
"""
import pytest
from sentrix.data.loader import repo
from sentrix.models.schemas import Incident, InterventionScenario
from sentrix.simulation.engine import CascadingFailureSimulator
from sentrix.simulation.ranking import ranking_engine


@pytest.fixture
def ranking_setup():
    graph_data = repo.get_graph_data()
    scen_raw = repo.get_scenario_raw("scenario-flood-central-2026")
    incident = Incident(
        id=scen_raw["id"],
        title=scen_raw["title"],
        category=scen_raw["category"],
        severity=scen_raw["severity"],
        epicenter=tuple(scen_raw["epicenter"]),
        radius_meters=scen_raw["radius_meters"],
        flood_depth_cm=scen_raw["flood_depth_cm"],
        progression_rate_cm_per_hour=scen_raw["progression_rate_cm_per_hour"],
        description=scen_raw["description"],
        evidence=scen_raw["evidence"]
    )
    simulator = CascadingFailureSimulator(graph_data)

    base_scen = InterventionScenario.model_validate(scen_raw["interventions"][0])
    base_run = simulator.run_simulation(incident, base_scen)

    candidate_runs = []
    for raw_itv in scen_raw["interventions"][1:]:
        cand_scen = InterventionScenario.model_validate(raw_itv)
        cand_run = simulator.run_simulation(incident, cand_scen)
        candidate_runs.append((cand_scen, cand_run))

    return base_run, candidate_runs


def test_ranking_hierarchy(ranking_setup):
    """Verifies that Combined Mitigation ranks #1 and Baseline ranks lowest."""
    base_run, candidate_runs = ranking_setup
    evals = ranking_engine.evaluate_scenarios(base_run, candidate_runs)

    assert len(evals) == 4
    # Top rank should be Rank 1
    assert evals[0].rank == 1
    assert evals[0].category == "COMBINED_MITIGATION"
    assert evals[0].impact_reduction_pct >= 20.0

    # Baseline should be lowest composite score
    baseline_eval = next(e for e in evals if e.category == "BASELINE")
    assert baseline_eval.composite_rank_score < evals[0].composite_rank_score


def test_sensitivity_bounds(ranking_setup):
    """Verifies that sensitivity bounds are computed and positive."""
    base_run, candidate_runs = ranking_setup
    evals = ranking_engine.evaluate_scenarios(base_run, candidate_runs)

    for ev in evals:
        assert "impact_low_severity" in ev.sensitivity_bounds
        assert "impact_high_severity" in ev.sensitivity_bounds
        assert ev.sensitivity_bounds["impact_high_severity"] >= ev.sensitivity_bounds["impact_low_severity"]
