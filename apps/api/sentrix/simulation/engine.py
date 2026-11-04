"""
SENTRIX — Deterministic Cascading Failure Simulation Engine
Models multi-step urban infrastructure failure propagation across physical and operational dependencies.
"""
import math
import time
import copy
from typing import Dict, Any, List, Optional, Tuple, Set
import networkx as nx

from sentrix.models.schemas import (
    InfrastructureAsset,
    InfrastructureDependency,
    InfrastructureGraphData,
    Incident,
    InterventionScenario,
    InterventionAction,
    SimulationRunResult,
    StepMetrics,
    SimulationStepEvent,
    OperationalState,
    DependencyType,
    AssetType
)


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in meters between two coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class CascadingFailureSimulator:
    def __init__(self, graph_data: InfrastructureGraphData):
        self.base_graph_data = graph_data
        self.nominal_transit_minutes = 3.5  # EMS Station 4 to St. Jude nominal

    def run_simulation(
        self,
        incident: Incident,
        scenario: InterventionScenario,
        time_horizon_hours: int = 5,
        step_size_hours: float = 1.0,
        random_seed: int = 42
    ) -> SimulationRunResult:
        start_time = time.perf_counter()

        # Deep copy assets to ensure strict scenario isolation
        assets: Dict[str, InfrastructureAsset] = {
            a.id: a.model_copy(deep=True) for a in self.base_graph_data.assets
        }
        dependencies: List[InfrastructureDependency] = [
            d.model_copy(deep=True) for d in self.base_graph_data.dependencies
        ]

        # Map actions by target asset
        active_actions: Dict[str, List[InterventionAction]] = {}
        for act in scenario.actions:
            for target_id in act.target_asset_ids:
                active_actions.setdefault(target_id, []).append(act)

        steps_metrics: List[StepMetrics] = []
        events_log: List[SimulationStepEvent] = []
        # Track emitted state transition events to eliminate duplicates across steps
        emitted_event_keys: Set[Tuple[str, str]] = set()

        def emit_event(
            ev_step: int,
            ev_t_hours: float,
            ev_asset_id: str,
            ev_asset_name: str,
            ev_type: str,
            ev_desc: str,
            ev_severity: str
        ) -> None:
            key = (ev_asset_id, ev_type)
            if key not in emitted_event_keys:
                emitted_event_keys.add(key)
                events_log.append(SimulationStepEvent(
                    step=ev_step,
                    time_offset_hours=ev_t_hours,
                    asset_id=ev_asset_id,
                    asset_name=ev_asset_name,
                    event_type=ev_type,
                    description=ev_desc,
                    severity=ev_severity
                ))

        # Number of discrete steps
        num_steps = int(time_horizon_hours / step_size_hours) + 1

        for step in range(num_steps):
            t_hours = step * step_size_hours

            # -------------------------------------------------------------
            # 1. Apply Interventions arriving by t_hours
            # -------------------------------------------------------------
            for asset_id, actions in active_actions.items():
                for act in actions:
                    if t_hours >= act.deployment_delay_hours:
                        if act.action_type == "BACKUP_DEPLOYMENT" and step == 1:
                            extra_hours = act.parameters.get("backup_power_hours_added", 6.0)
                            if asset_id in assets:
                                assets[asset_id].backup_power_hours += extra_hours
                                assets[asset_id].backup_power_remaining_hours += extra_hours
                                emit_event(
                                    step, t_hours, asset_id, assets[asset_id].name,
                                    "INTERVENTION_APPLIED",
                                    f"Auxiliary mobile generator deployed: +{extra_hours:.1f}h backup runtime.",
                                    "INFO"
                                )

            # -------------------------------------------------------------
            # 2. Inundation & Direct Physical Impact Evaluation
            # -------------------------------------------------------------
            epi_lat, epi_lon = incident.epicenter
            for asset_id, asset in assets.items():
                dist_m = haversine_distance_m(asset.lat, asset.lon, epi_lat, epi_lon)
                if dist_m <= incident.radius_meters:
                    spatial_factor = max(0.0, 1.0 - (dist_m / incident.radius_meters))
                else:
                    spatial_factor = 0.0

                progression = t_hours * incident.progression_rate_cm_per_hour
                raw_water_level = (incident.flood_depth_cm + progression) * spatial_factor
                elevation_mitigation = max(0.0, (asset.elevation_m - 2.0) * 12.0)
                effective_water_cm = max(0.0, raw_water_level - elevation_mitigation)

                barrier_protection = 0.0
                if asset_id in active_actions:
                    for act in active_actions[asset_id]:
                        if act.action_type == "FLOOD_BARRIER" and t_hours >= act.deployment_delay_hours:
                            barrier_protection += act.parameters.get("effective_barrier_protection_cm", 80.0)

                net_water_cm = max(0.0, effective_water_cm - barrier_protection)

                # Direct flood state transitions
                if net_water_cm >= asset.flood_depth_threshold_cm:
                    if asset.operational_state != OperationalState.FAILED:
                        asset.operational_state = OperationalState.FAILED
                        emit_event(
                            step, t_hours, asset.id, asset.name,
                            "DIRECT_INUNDATION",
                            f"Flood depth reached {net_water_cm:.1f}cm (exceeds threshold {asset.flood_depth_threshold_cm:.1f}cm). Asset inundated.",
                            "CRITICAL"
                        )
                elif barrier_protection > 0 and net_water_cm < (asset.flood_depth_threshold_cm * 0.5):
                    if asset.operational_state == OperationalState.FAILED:
                        asset.operational_state = OperationalState.NOMINAL
                        # Reset inundation event key so future flooding can be recorded
                        emitted_event_keys.discard((asset.id, "DIRECT_INUNDATION"))
                        emit_event(
                            step, t_hours, asset.id, asset.name,
                            "DEWATERING_RESTORATION",
                            "Active flood barriers and high-capacity dewatering pumps cleared water. Asset restored to NOMINAL.",
                            "INFO"
                        )
                elif net_water_cm > (asset.flood_depth_threshold_cm * 0.6):
                    if asset.operational_state == OperationalState.NOMINAL:
                        asset.operational_state = OperationalState.DEGRADED
                        emit_event(
                            step, t_hours, asset.id, asset.name,
                            "WATER_SURGE_DEGRADATION",
                            f"Water level reached {net_water_cm:.1f}cm. Operating under elevated hydraulic stress.",
                            "WARNING"
                        )

            # -------------------------------------------------------------
            # 3. Upstream Dependency Propagation (Fixed-Point Convergence)
            # Separated strictly from resource consumption.
            # Cycles terminate safely within bounded iterations.
            # -------------------------------------------------------------
            def run_dependency_propagation() -> bool:
                """Propagates lifeline edge severances and state changes. Returns True if any state changed."""
                any_change = False
                max_iter = max(6, len(assets) + 2)
                iter_idx = 0

                while iter_idx < max_iter:
                    iter_idx += 1
                    local_change = False

                    # A. Update edge statuses based on source asset states
                    for dep in dependencies:
                        source = assets.get(dep.source_asset_id)
                        if source:
                            new_status = "SEVERED" if source.operational_state == OperationalState.FAILED else "ACTIVE"
                            if dep.status != new_status:
                                dep.status = new_status
                                local_change = True

                    # B. Propagate service interruption to dependent targets
                    for asset_id, asset in assets.items():
                        if asset.operational_state == OperationalState.FAILED:
                            continue

                        # Check incoming water dependencies
                        water_deps = [
                            d for d in dependencies
                            if d.target_asset_id == asset_id and d.dependency_type == DependencyType.WATER_SERVICE
                        ]
                        if water_deps and all(d.status == "SEVERED" for d in water_deps):
                            if asset.operational_state == OperationalState.NOMINAL:
                                asset.operational_state = OperationalState.DEGRADED
                                local_change = True
                                emit_event(
                                    step, t_hours, asset.id, asset.name,
                                    "WATER_SERVICE_INTERRUPTED",
                                    f"Municipal water pressure lost due to upstream pumping failure. Sterilization compromised.",
                                    "WARNING"
                                )

                    if not local_change:
                        break
                    any_change = True

                return any_change

            # Initial propagation for this step
            run_dependency_propagation()

            # -------------------------------------------------------------
            # 4. Time-Dependent Resource Consumption
            # Executed EXACTLY ONCE per simulation time step per unpowered asset.
            # Decoupled completely from propagation iterations.
            # -------------------------------------------------------------
            post_propagation_needed = False

            for asset_id, asset in assets.items():
                if asset.operational_state == OperationalState.FAILED:
                    continue

                in_power_deps = [
                    d for d in dependencies
                    if d.target_asset_id == asset_id and d.dependency_type == DependencyType.POWER_GRID
                ]

                # Check if asset has incoming grid feeds and whether all are severed
                if in_power_deps and all(d.status == "SEVERED" for d in in_power_deps):
                    # Asset is isolated from primary grid power
                    if asset.backup_power_remaining_hours > 0.0:
                        # Decrement fuel exactly once per simulation step
                        asset.backup_power_remaining_hours = max(
                            0.0, asset.backup_power_remaining_hours - step_size_hours
                        )

                        if asset.backup_power_remaining_hours > 0.0:
                            if asset.operational_state != OperationalState.DEGRADED:
                                asset.operational_state = OperationalState.DEGRADED
                            emit_event(
                                step, t_hours, asset.id, asset.name,
                                "GRID_POWER_LOST",
                                f"Primary grid feed severed. Running on emergency generator ({asset.backup_power_remaining_hours:.1f}h remaining).",
                                "WARNING"
                            )
                        else:
                            # Generator exhausted in this step!
                            emit_event(
                                step, t_hours, asset.id, asset.name,
                                "POWER_EXHAUSTION",
                                "Emergency diesel generator reserves exhausted. Facility operating under critical brownout.",
                                "CRITICAL"
                            )
                            if asset.asset_type == AssetType.HOSPITAL:
                                asset.operational_state = OperationalState.DEGRADED
                                asset.current_load = asset.total_capacity * 0.35
                            else:
                                asset.operational_state = OperationalState.FAILED
                                post_propagation_needed = True
                    else:
                        # Asset has 0.0h backup power remaining (or zero initial backup)
                        if asset.asset_type == AssetType.HOSPITAL:
                            if asset.operational_state != OperationalState.DEGRADED:
                                asset.operational_state = OperationalState.DEGRADED
                                asset.current_load = asset.total_capacity * 0.35
                            emit_event(
                                step, t_hours, asset.id, asset.name,
                                "POWER_EXHAUSTION",
                                "Emergency backup generator exhausted. Hospital ICU and surgery in acute brownout.",
                                "CRITICAL"
                            )
                        else:
                            if asset.operational_state != OperationalState.FAILED:
                                asset.operational_state = OperationalState.FAILED
                                post_propagation_needed = True
                                emit_event(
                                    step, t_hours, asset.id, asset.name,
                                    "POWER_EXHAUSTION",
                                    "Asset has zero backup power. Equipment completely halted.",
                                    "CRITICAL"
                                )

            # If any unpowered component without backup failed, re-propagate downstream effects
            if post_propagation_needed:
                run_dependency_propagation()

            # -------------------------------------------------------------
            # 5. Road Network Accessibility & Shortest Path Routing
            # -------------------------------------------------------------
            road_graph = nx.Graph()
            for dep in dependencies:
                if dep.dependency_type in [DependencyType.PHYSICAL_ROAD, DependencyType.EMERGENCY_ACCESS]:
                    u = dep.source_asset_id
                    v = dep.target_asset_id
                    u_asset = assets.get(u)
                    v_asset = assets.get(v)

                    if not u_asset or not v_asset:
                        continue

                    # Road link is impassable if either junction is FAILED
                    if u_asset.operational_state == OperationalState.FAILED or v_asset.operational_state == OperationalState.FAILED:
                        dep.status = "SEVERED"
                        continue

                    # Check Road Diversion Intervention
                    transit_time = dep.transit_time_minutes
                    for act in scenario.actions:
                        if act.action_type == "ROAD_DIVERSION" and t_hours >= act.deployment_delay_hours:
                            if u in act.target_asset_ids or v in act.target_asset_ids:
                                if "ridge" in u or "ridge" in v:
                                    transit_time = max(1.5, transit_time * 0.7)  # Priority signal green-wave

                    dep.status = "ACTIVE"
                    road_graph.add_edge(u, v, weight=transit_time, distance_m=dep.weight_distance_m)

            # Compute route from Station 4 EMS to St. Jude Trauma Center
            ems_id = "ems-station-04"
            hospital_id = "hospital-st-jude"
            travel_distance_km = 1.4
            transit_minutes = self.nominal_transit_minutes

            try:
                if road_graph.has_node(ems_id) and road_graph.has_node(hospital_id):
                    shortest_path = nx.shortest_path(road_graph, ems_id, hospital_id, weight="weight")
                    transit_minutes = nx.shortest_path_length(road_graph, ems_id, hospital_id, weight="weight")
                    dist_m = sum(
                        road_graph[u][v].get("distance_m", 500.0)
                        for u, v in zip(shortest_path[:-1], shortest_path[1:])
                    )
                    travel_distance_km = dist_m / 1000.0
                else:
                    raise nx.NetworkXNoPath("Disconnected nodes")
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                # Hospital is isolated!
                transit_minutes = 28.0  # Impassable delay penalty
                travel_distance_km = 0.0
                if hospital_id in assets and assets[hospital_id].operational_state != OperationalState.FAILED:
                    assets[hospital_id].operational_state = OperationalState.ISOLATED
                    emit_event(
                        step, t_hours, hospital_id, assets[hospital_id].name,
                        "ACCESS_SEVERED",
                        "All primary and auxiliary road access corridors severed. Trauma Center isolated from emergency EMS intake.",
                        "CRITICAL"
                    )

            access_delay_proxy = max(0.0, transit_minutes - self.nominal_transit_minutes)

            # 5. Compute Quantitative Metrics
            affected_count = sum(
                1 for a in assets.values() if a.operational_state != OperationalState.NOMINAL
            )
            critical_disrupted = sum(
                1 for a in assets.values()
                if a.criticality >= 4 and a.operational_state != OperationalState.NOMINAL
            )
            total_road_links = sum(
                1 for d in dependencies if d.dependency_type in [DependencyType.PHYSICAL_ROAD, DependencyType.EMERGENCY_ACCESS]
            )
            passable_road_links = road_graph.number_of_edges()
            accessible_road_pct = (passable_road_links / max(1, total_road_links)) * 100.0

            dependency_failures = sum(1 for d in dependencies if d.status == "SEVERED")

            # Weighted Impact Calculation: Sum(criticality * penalty)
            penalty_map = {
                OperationalState.NOMINAL: 0.0,
                OperationalState.DEGRADED: 0.45,
                OperationalState.ISOLATED: 0.85,
                OperationalState.FAILED: 1.0,
            }
            total_impact = sum(
                a.criticality * penalty_map[a.operational_state] for a in assets.values()
            )
            # Add delay penalty to total impact
            total_impact += access_delay_proxy * 0.5

            step_metric = StepMetrics(
                step=step,
                time_offset_hours=t_hours,
                affected_assets_count=affected_count,
                critical_facilities_disrupted=critical_disrupted,
                accessible_road_pct=round(accessible_road_pct, 1),
                average_travel_distance_km=round(travel_distance_km, 2),
                access_delay_proxy_minutes=round(access_delay_proxy, 1),
                dependency_failure_count=dependency_failures,
                total_weighted_impact=round(total_impact, 2),
                asset_states={a.id: a.operational_state for a in assets.values()}
            )
            steps_metrics.append(step_metric)

        exec_duration_ms = (time.perf_counter() - start_time) * 1000.0

        return SimulationRunResult(
            simulation_id=f"sim-{scenario.id}-{int(time.time())}",
            scenario_id=scenario.id,
            scenario_name=scenario.name,
            parameters={
                "incident_id": incident.id,
                "flood_depth_cm": incident.flood_depth_cm,
                "progression_rate_cm_per_hour": incident.progression_rate_cm_per_hour,
                "time_horizon_hours": time_horizon_hours,
                "random_seed": random_seed
            },
            timeline_steps=steps_metrics,
            events=events_log,
            final_metrics=steps_metrics[-1],
            stabilization_reached=True,
            execution_duration_ms=round(exec_duration_ms, 2)
        )
