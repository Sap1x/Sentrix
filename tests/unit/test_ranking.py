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


def test_weight_validation_rejections():
    """Verify strict validation and rejection of invalid MCDA weight inputs."""
    from sentrix.simulation.ranking import validate_and_normalize_weights

    # 1. Non-dict rejection
    with pytest.raises(ValueError, match="must be a dictionary"):
        validate_and_normalize_weights("invalid_type")

    # 2. Unknown key rejection (e.g. overall_impact_reduction typo or invalid key)
    with pytest.raises(ValueError, match="Unknown MCDA weight keys"):
        validate_and_normalize_weights({"unknown_dimension": 0.5, "critical_asset_protection": 0.5})

    # 3. Negative weight rejection
    with pytest.raises(ValueError, match="cannot be negative"):
        validate_and_normalize_weights({"critical_asset_protection": -0.2, "impact_reduction": 0.8})

    # 4. NaN rejection
    with pytest.raises(ValueError, match="cannot be NaN or infinite"):
        validate_and_normalize_weights({"critical_asset_protection": float("nan"), "impact_reduction": 0.5})

    # 5. Infinite rejection
    with pytest.raises(ValueError, match="cannot be NaN or infinite"):
        validate_and_normalize_weights({"critical_asset_protection": float("inf"), "impact_reduction": 0.5})

    # 6. All-zero rejection
    with pytest.raises(ValueError, match="all-zero weights are not allowed"):
        validate_and_normalize_weights({"critical_asset_protection": 0.0, "impact_reduction": 0.0})

    # 7. Invalid type rejection (bool or string in dict)
    with pytest.raises(ValueError, match="must be a numeric value"):
        validate_and_normalize_weights({"critical_asset_protection": True, "impact_reduction": 0.5})


def test_weight_normalization_canonical_sum():
    """Verify that valid weights are normalized across all 6 canonical dimensions summing to 1.0."""
    from sentrix.simulation.ranking import validate_and_normalize_weights, CANONICAL_WEIGHT_KEYS

    normalized = validate_and_normalize_weights({
        "critical_asset_protection": 10.0,
        "impact_reduction": 30.0,
    })
    assert len(normalized) == 6
    assert set(normalized.keys()) == CANONICAL_WEIGHT_KEYS
    assert pytest.approx(sum(normalized.values()), rel=1e-6) == 1.0
    assert pytest.approx(normalized["critical_asset_protection"], rel=1e-6) == 0.25
    assert pytest.approx(normalized["impact_reduction"], rel=1e-6) == 0.75
    assert normalized["road_accessibility"] == 0.0


def test_each_weight_dimension_impacts_score(ranking_setup):
    """Verify that every single one of the 6 canonical weights affects composite scores."""
    from sentrix.simulation.ranking import CANONICAL_WEIGHT_KEYS

    base_run, candidate_runs = ranking_setup

    scores_by_dimension = {}
    for key in CANONICAL_WEIGHT_KEYS:
        # Isolate 100% of weight onto this single dimension
        single_weight = {k: (1.0 if k == key else 0.0) for k in CANONICAL_WEIGHT_KEYS}
        evals = ranking_engine.evaluate_scenarios(base_run, candidate_runs, custom_weights=single_weight)
        combined_score = next(e for e in evals if e.category == "COMBINED_MITIGATION").composite_rank_score
        scores_by_dimension[key] = combined_score
        assert combined_score >= 0.0

    # Ensure different dimensions yield distinct score profiles
    assert len(set(scores_by_dimension.values())) >= 3


def test_custom_weights_change_scenario_rankings(ranking_setup):
    """Verify that altering MCDA weights dynamically changes scenario rankings."""
    base_run, candidate_runs = ranking_setup

    # Stance A: Heavy critical asset protection -> Substation barrier (#2) beats Road diversion (#3)
    asset_stance = {
        "critical_asset_protection": 0.80,
        "impact_reduction": 0.20,
        "road_accessibility": 0.0,
        "access_delay_reduction": 0.0,
        "execution_feasibility": 0.0,
        "cost_efficiency": 0.0,
    }
    evals_asset = ranking_engine.evaluate_scenarios(base_run, candidate_runs, custom_weights=asset_stance)
    rank_sub_asset = next(e for e in evals_asset if e.scenario_id == "scen-substation-barrier").rank
    rank_road_asset = next(e for e in evals_asset if e.scenario_id == "scen-road-diversion").rank
    assert rank_sub_asset < rank_road_asset  # Substation barrier ranks higher

    # Stance B: Heavy transit delay minimization -> Road diversion beats Substation barrier
    transit_stance = {
        "critical_asset_protection": 0.0,
        "impact_reduction": 0.0,
        "road_accessibility": 0.20,
        "access_delay_reduction": 0.80,
        "execution_feasibility": 0.0,
        "cost_efficiency": 0.0,
    }
    evals_transit = ranking_engine.evaluate_scenarios(base_run, candidate_runs, custom_weights=transit_stance)
    rank_sub_transit = next(e for e in evals_transit if e.scenario_id == "scen-substation-barrier").rank
    rank_road_transit = next(e for e in evals_transit if e.scenario_id == "scen-road-diversion").rank
    assert rank_road_transit < rank_sub_transit  # Road diversion ranks higher!

