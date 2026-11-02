"""
SENTRIX — Digital Twin Data Loader & Graph Storage
Loads and manages infrastructure digital twin assets, dependencies, and predefined incident scenarios.
"""
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from sentrix.models.schemas import (
    InfrastructureGraphData,
    InfrastructureAsset,
    InfrastructureDependency,
    Incident,
    InterventionScenario
)

# Locate repo root by walking up to find .git or 'data' directory
current = Path(__file__).resolve()
ROOT_DIR = None
for p in current.parents:
    if (p / "data" / "fixtures").exists():
        ROOT_DIR = p
        break

if ROOT_DIR is None:
    ROOT_DIR = Path(__file__).resolve().parents[4]

FIXTURES_DIR = ROOT_DIR / "data" / "fixtures"
SCENARIOS_DIR = ROOT_DIR / "data" / "scenarios"


class DigitalTwinRepository:
    _instance: Optional["DigitalTwinRepository"] = None

    def __init__(self):
        self._graph_data: Optional[InfrastructureGraphData] = None
        self._assets_map: Dict[str, InfrastructureAsset] = {}
        self._dependencies_map: Dict[str, InfrastructureDependency] = {}
        self._scenarios_map: Dict[str, Dict[str, Any]] = {}
        self.reload_all()

    @classmethod
    def get_instance(cls) -> "DigitalTwinRepository":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def reload_all(self):
        # Load Digital Twin Fixture
        dt_path = FIXTURES_DIR / "metropolis_digital_twin.json"
        if not dt_path.exists():
            raise FileNotFoundError(f"Digital twin fixture missing at {dt_path}")

        with open(dt_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        self._graph_data = InfrastructureGraphData.model_validate(raw_data)
        self._assets_map = {a.id: a for a in self._graph_data.assets}
        self._dependencies_map = {d.id: d for d in self._graph_data.dependencies}

        # Load Scenarios
        self._scenarios_map.clear()
        for s_file in SCENARIOS_DIR.glob("*.json"):
            with open(s_file, "r", encoding="utf-8") as f:
                scen_raw = json.load(f)
                self._scenarios_map[scen_raw["id"]] = scen_raw

    def get_graph_data(self) -> InfrastructureGraphData:
        if self._graph_data is None:
            self.reload_all()
        return self._graph_data

    def get_asset(self, asset_id: str) -> Optional[InfrastructureAsset]:
        return self._assets_map.get(asset_id)

    def list_assets(self) -> List[InfrastructureAsset]:
        return list(self._assets_map.values())

    def list_dependencies(self) -> List[InfrastructureDependency]:
        return list(self._dependencies_map.values())

    def get_scenario_raw(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        return self._scenarios_map.get(scenario_id)

    def list_scenarios(self) -> List[Dict[str, Any]]:
        return list(self._scenarios_map.values())


repo = DigitalTwinRepository.get_instance()
