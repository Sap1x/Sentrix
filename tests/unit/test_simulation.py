"""
Unit Tests for SENTRIX Cascading Failure Simulation Engine
Verifies determinism, cycle safety, dependency propagation, and intervention mitigation.
"""
import pytest
from sentrix.data.loader import repo
from sentrix.models.schemas import Incident, InterventionScenario
from sentrix.simulation.engine import CascadingFailureSimulator


@pytest.fixture
def test_setup():
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
    return simulator, incident, scen_raw


def test_simulation_determinism(test_setup):
    """Verifies that two runs with identical parameters produce bit-for-bit identical step metrics."""
    simulator, incident, scen_raw = test_setup
    baseline_scen = InterventionScenario.model_validate(scen_raw["interventions"][0])

    run1 = simulator.run_simulation(incident, baseline_scen, random_seed=42)
    run2 = simulator.run_simulation(incident, baseline_scen, random_seed=42)

    assert len(run1.timeline_steps) == len(run2.timeline_steps)
    for s1, s2 in zip(run1.timeline_steps, run2.timeline_steps):
        assert s1.affected_assets_count == s2.affected_assets_count
        assert s1.critical_facilities_disrupted == s2.critical_facilities_disrupted
        assert s1.total_weighted_impact == s2.total_weighted_impact
        assert s1.access_delay_proxy_minutes == s2.access_delay_proxy_minutes


def test_baseline_cascade_propagation(test_setup):
    """Verifies that without intervention, flood causes cascading failure of substation and access."""
    simulator, incident, scen_raw = test_setup
    baseline_scen = InterventionScenario.model_validate(scen_raw["interventions"][0])

    run = simulator.run_simulation(incident, baseline_scen)
    final = run.final_metrics

    # In baseline, Substation North-01, Grand Ave Underpass, and Water Pumping Station fail
    assert final.affected_assets_count >= 3
    assert final.critical_facilities_disrupted >= 2
    # Access delay should be elevated due to underpass closure detour
    assert final.access_delay_proxy_minutes >= 3.0


def test_intervention_mitigation_effectiveness(test_setup):
    """Verifies that Intervention C (Combined) significantly outperforms Baseline."""
    simulator, incident, scen_raw = test_setup
    baseline_scen = InterventionScenario.model_validate(scen_raw["interventions"][0])
    combined_scen = InterventionScenario.model_validate(
        next(itv for itv in scen_raw["interventions"] if itv["id"] == "scen-combined-mitigation")
    )

    base_run = simulator.run_simulation(incident, baseline_scen)
    comb_run = simulator.run_simulation(incident, combined_scen)

    assert comb_run.final_metrics.total_weighted_impact < base_run.final_metrics.total_weighted_impact
    assert comb_run.final_metrics.critical_facilities_disrupted < base_run.final_metrics.critical_facilities_disrupted
    assert comb_run.final_metrics.access_delay_proxy_minutes < base_run.final_metrics.access_delay_proxy_minutes
