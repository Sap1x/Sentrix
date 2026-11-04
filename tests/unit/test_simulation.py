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


def test_backup_generator_exact_hourly_depletion(test_setup):
    """
    Regression Test: Ensures backup generator fuel is decremented EXACTLY ONCE
    per simulation time step (not once per dependency propagation iteration).
    """
    simulator, incident, scen_raw = test_setup
    baseline_scen = InterventionScenario.model_validate(scen_raw["interventions"][0])

    # Run 5-step simulation with 1.0 hour step size
    run = simulator.run_simulation(incident, baseline_scen, time_horizon_hours=5, step_size_hours=1.0)

    # Substation North trips at t=1h.
    # St. Jude Hospital starts with 2.0h backup fuel.
    # At t=0h: grid is active (2.0h remaining).
    # At t=1h: grid trips, running on generator (fuel decremented by 1.0h -> 1.0h remaining).
    # At t=2h: grid remains severed (fuel decremented by 1.0h -> 0.0h remaining, exhausted).
    # At t=3h, 4h, 5h: fuel remains at 0.0h (exhausted).
    fuel_events = [e for e in run.events if e.asset_id == "hospital-st-jude" and e.event_type in ["GRID_POWER_LOST", "POWER_EXHAUSTION"]]

    # GRID_POWER_LOST should be emitted exactly once (at t=1h)
    grid_lost_events = [e for e in fuel_events if e.event_type == "GRID_POWER_LOST"]
    assert len(grid_lost_events) == 1
    assert grid_lost_events[0].time_offset_hours == 1.0
    assert "1.0h remaining" in grid_lost_events[0].description

    # POWER_EXHAUSTION should be emitted exactly once (at t=2h)
    exhaustion_events = [e for e in fuel_events if e.event_type == "POWER_EXHAUSTION"]
    assert len(exhaustion_events) == 1
    assert exhaustion_events[0].time_offset_hours == 2.0


def test_multi_dependency_redundancy_and_single_decrement():
    """
    Regression Test: Verifies that an asset with MULTIPLE incoming power feeds
    does not have its backup power decremented multiple times in a single step.
    """
    from sentrix.models.schemas import (
        InfrastructureAsset, InfrastructureDependency, InfrastructureGraphData,
        Incident, InterventionScenario, DependencyType, AssetType, OperationalState
    )

    # Create 2 substations and 1 hospital with dual feeds
    sub_a = InfrastructureAsset(
        id="sub-a", name="Substation A", asset_type=AssetType.ELECTRICAL_SUBSTATION,
        lat=40.710, lon=-74.010, elevation_m=1.0, criticality=5,
        operational_state=OperationalState.NOMINAL, flood_depth_threshold_cm=20.0,
        backup_power_hours=0.0, backup_power_remaining_hours=0.0
    )
    sub_b = InfrastructureAsset(
        id="sub-b", name="Substation B", asset_type=AssetType.ELECTRICAL_SUBSTATION,
        lat=40.711, lon=-74.011, elevation_m=1.0, criticality=5,
        operational_state=OperationalState.NOMINAL, flood_depth_threshold_cm=20.0,
        backup_power_hours=0.0, backup_power_remaining_hours=0.0
    )
    hospital = InfrastructureAsset(
        id="hosp-dual", name="Dual Feed Hospital", asset_type=AssetType.HOSPITAL,
        lat=40.720, lon=-74.020, elevation_m=10.0, criticality=5,
        operational_state=OperationalState.NOMINAL, flood_depth_threshold_cm=999.0,
        backup_power_hours=3.0, backup_power_remaining_hours=3.0,
        upstream_dependencies=["sub-a", "sub-b"]
    )

    dep_a = InfrastructureDependency(
        id="dep-a", source_asset_id="sub-a", target_asset_id="hosp-dual",
        dependency_type=DependencyType.POWER_GRID, criticality=5, status="ACTIVE",
        failure_propagation_delay_hours=0.0
    )
    dep_b = InfrastructureDependency(
        id="dep-b", source_asset_id="sub-b", target_asset_id="hosp-dual",
        dependency_type=DependencyType.POWER_GRID, criticality=5, status="ACTIVE",
        failure_propagation_delay_hours=0.0
    )

    graph_data = InfrastructureGraphData(
        version="test", region_name="test", center_coordinates=[40.71, -74.01],
        assets=[sub_a, sub_b, hospital], dependencies=[dep_a, dep_b]
    )

    # Incident floods both substations immediately at t=0
    incident = Incident(
        id="inc-test", title="Surge", category="URBAN_FLASH_FLOOD", severity="CRITICAL",
        epicenter=(40.710, -74.010), radius_meters=5000.0, flood_depth_cm=100.0,
        progression_rate_cm_per_hour=0.0, description="Test", evidence=[]
    )
    scenario = InterventionScenario(id="scen-test", name="Test", category="BASELINE", actions=[], description="")

    sim = CascadingFailureSimulator(graph_data)
    result = sim.run_simulation(incident, scenario, time_horizon_hours=3, step_size_hours=1.0)

    # In step 0 (t=0h): Both substations fail immediately.
    # Despite 2 incoming failed feeds, hospital backup fuel should be decremented by EXACTLY 1.0h (from 3.0h to 2.0h)!
    # Not decremented twice to 1.0h!
    step0_state = result.timeline_steps[0]
    assert step0_state.asset_states["hosp-dual"] == OperationalState.DEGRADED

    # Check fuel events: only 1 GRID_POWER_LOST event in step 0, with 2.0h remaining!
    grid_events = [e for e in result.events if e.asset_id == "hosp-dual" and e.event_type == "GRID_POWER_LOST"]
    assert len(grid_events) == 1
    assert "2.0h remaining" in grid_events[0].description


def test_cycle_termination_safety():
    """
    Regression Test: Ensures circular dependencies (A -> B -> C -> A)
    terminate safely without infinite loops or stack overflow.
    """
    from sentrix.models.schemas import (
        InfrastructureAsset, InfrastructureDependency, InfrastructureGraphData,
        Incident, InterventionScenario, DependencyType, AssetType, OperationalState
    )

    a1 = InfrastructureAsset(
        id="node-a", name="Node A", asset_type=AssetType.COMMUNICATION_FACILITY,
        lat=40.710, lon=-74.010, elevation_m=1.0, criticality=4,
        operational_state=OperationalState.NOMINAL, flood_depth_threshold_cm=20.0
    )
    a2 = InfrastructureAsset(
        id="node-b", name="Node B", asset_type=AssetType.COMMUNICATION_FACILITY,
        lat=40.711, lon=-74.011, elevation_m=10.0, criticality=4,
        operational_state=OperationalState.NOMINAL, flood_depth_threshold_cm=999.0
    )
    a3 = InfrastructureAsset(
        id="node-c", name="Node C", asset_type=AssetType.COMMUNICATION_FACILITY,
        lat=40.712, lon=-74.012, elevation_m=10.0, criticality=4,
        operational_state=OperationalState.NOMINAL, flood_depth_threshold_cm=999.0
    )

    # Cycle: Node A -> Node B -> Node C -> Node A
    d1 = InfrastructureDependency(id="d1", source_asset_id="node-a", target_asset_id="node-b", dependency_type=DependencyType.POWER_GRID, criticality=4, status="ACTIVE")
    d2 = InfrastructureDependency(id="d2", source_asset_id="node-b", target_asset_id="node-c", dependency_type=DependencyType.WATER_SERVICE, criticality=4, status="ACTIVE")
    d3 = InfrastructureDependency(id="d3", source_asset_id="node-c", target_asset_id="node-a", dependency_type=DependencyType.COMMUNICATION, criticality=4, status="ACTIVE")

    graph = InfrastructureGraphData(
        version="cycle", region_name="cycle", center_coordinates=[40.71, -74.01],
        assets=[a1, a2, a3], dependencies=[d1, d2, d3]
    )

    incident = Incident(
        id="inc-cycle", title="Cycle Test", category="URBAN_FLASH_FLOOD", severity="CRITICAL",
        epicenter=(40.710, -74.010), radius_meters=2000.0, flood_depth_cm=80.0,
        progression_rate_cm_per_hour=0.0, description="Cycle Test", evidence=[]
    )
    scenario = InterventionScenario(id="scen-cycle", name="Cycle", category="BASELINE", actions=[], description="")

    sim = CascadingFailureSimulator(graph)
    # Must complete quickly without hanging
    result = sim.run_simulation(incident, scenario, time_horizon_hours=2)
    assert result.stabilization_reached is True
    assert len(result.timeline_steps) == 3


def test_event_log_no_duplicates(test_setup):
    """
    Regression Test: Ensures event log contains zero duplicate (step, asset_id, event_type) tuples.
    """
    simulator, incident, scen_raw = test_setup
    baseline_scen = InterventionScenario.model_validate(scen_raw["interventions"][0])

    run = simulator.run_simulation(incident, baseline_scen, time_horizon_hours=5)

    seen = set()
    for e in run.events:
        key = (e.step, e.asset_id, e.event_type)
        assert key not in seen, f"Duplicate event found: {key}"
        seen.add(key)

