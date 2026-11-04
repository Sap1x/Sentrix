"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Sidebar, ViewTab } from "../components/Sidebar";
import { InfrastructureMap } from "../components/InfrastructureMap";
import { DependencyGraphView } from "../components/DependencyGraphView";
import { TimelineController } from "../components/TimelineController";
import { IntelligencePanel } from "../components/IntelligencePanel";
import { ScenarioLab } from "../components/ScenarioLab";
import { IncidentIntake } from "../components/IncidentIntake";
import { DecisionBriefModal } from "../components/DecisionBriefModal";
import { SystemHealthModal } from "../components/SystemHealthModal";

import {
  InfrastructureGraphData,
  InfrastructureAsset,
  Incident,
  SimulationRunResult,
  ComparativeEvaluation,
  IntelligenceAnalysisResponse,
  DecisionBrief,
  SystemHealthResponse
} from "../lib/types";
import {
  fetchGraph,
  fetchScenarios,
  runSimulation,
  compareInterventions,
  fetchIntelligence,
  fetchDecisionBrief,
  fetchHealth
} from "../lib/api";
import { MapPin, GitBranch, RefreshCw, Layers } from "lucide-react";

export default function SentrixDashboard() {
  const [currentTab, setCurrentTab] = useState<ViewTab>("command_center");
  const [centerSubView, setCenterSubView] = useState<"map" | "dependency_graph">("map");

  // Core Data States
  const [graphData, setGraphData] = useState<InfrastructureGraphData | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [simulationRun, setSimulationRun] = useState<SimulationRunResult | null>(null);
  const [evaluations, setEvaluations] = useState<ComparativeEvaluation[]>([]);
  const [intelligence, setIntelligence] = useState<IntelligenceAnalysisResponse | null>(null);
  const [decisionBrief, setDecisionBrief] = useState<DecisionBrief | null>(null);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);

  // Interaction States
  const [selectedAsset, setSelectedAsset] = useState<InfrastructureAsset | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scen-baseline");
  const [activePreset, setActivePreset] = useState<string>("balanced");
  const [customWeights, setCustomWeights] = useState<Record<string, number> | undefined>(undefined);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [briefModalOpen, setBriefModalOpen] = useState<boolean>(false);
  const [healthModalOpen, setHealthModalOpen] = useState<boolean>(false);

  // Initial Data Fetch
  useEffect(() => {
    async function initPlatform() {
      try {
        setLoading(true);
        // Load Graph
        const gData = await fetchGraph();
        setGraphData(gData);

        // Load Scenarios & Seed Incident
        const scenarios = await fetchScenarios();
        if (scenarios.length > 0) {
          const s = scenarios[0];
          const inc: Incident = {
            id: s.id,
            title: s.title,
            category: s.category || "URBAN_FLASH_FLOOD",
            severity: s.severity || "CRITICAL",
            epicenter: s.epicenter,
            radius_meters: s.radius_meters || 1400.0,
            flood_depth_cm: s.flood_depth_cm || 65.0,
            progression_rate_cm_per_hour: s.progression_rate_cm_per_hour || 14.0,
            description: s.description || "",
            evidence: s.evidence || [],
          };
          setIncident(inc);

          // Run Baseline Simulation
          const sim = await runSimulation(inc.id, "scen-baseline");
          setSimulationRun(sim);

          // Run Counterfactual Evaluations
          const evals = await compareInterventions(inc.id);
          setEvaluations(evals);

          // Fetch Intelligence
          const intel = await fetchIntelligence(inc.id);
          setIntelligence(intel);

          // Fetch Health
          const h = await fetchHealth();
          setHealth(h);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initPlatform();
  }, []);

  // Handle Scenario Selection
  const handleSelectScenario = async (
    scenarioId: string,
    customInc?: Incident,
    weights?: Record<string, number>
  ) => {
    setSelectedScenarioId(scenarioId);
    const incToUse = customInc || incident;
    if (!incToUse) return;
    try {
      setLoading(true);
      const customParams = {
        custom_flood_depth_cm: incToUse.flood_depth_cm,
        custom_progression_rate_cm_per_hour: incToUse.progression_rate_cm_per_hour,
        custom_radius_meters: incToUse.radius_meters,
        custom_weights: weights || customWeights,
      };

      const sim = await runSimulation(incToUse.id, scenarioId, 5, customParams);
      setSimulationRun(sim);
      setCurrentStepIndex(0);
      setIsPlaying(false);

      const evals = await compareInterventions(incToUse.id, customParams);
      setEvaluations(evals);
    } catch (e) {
      console.error("Failed to load scenario run:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (presetId: string, weights: Record<string, number>) => {
    setActivePreset(presetId);
    setCustomWeights(weights);
    if (!incident) return;
    try {
      setLoading(true);
      const customParams = {
        custom_flood_depth_cm: incident.flood_depth_cm,
        custom_progression_rate_cm_per_hour: incident.progression_rate_cm_per_hour,
        custom_radius_meters: incident.radius_meters,
        custom_weights: weights,
      };
      const evals = await compareInterventions(incident.id, customParams);
      setEvaluations(evals);
    } catch (e) {
      console.error("Failed to re-weight scenarios:", e);
    } finally {
      setLoading(false);
    }
  };

  // Open Decision Brief
  const handleOpenDecisionBrief = async () => {
    if (!decisionBrief && incident) {
      try {
        const brief = await fetchDecisionBrief(incident.id);
        setDecisionBrief(brief);
      } catch (e) {
        console.error("Failed to fetch brief:", e);
      }
    }
    setBriefModalOpen(true);
  };

  const currentStepMetrics = simulationRun?.timeline_steps[currentStepIndex];
  const activeScenarioName =
    evaluations.find((e) => e.scenario_id === selectedScenarioId)?.scenario_name ||
    simulationRun?.scenario_name ||
    "Baseline Progression";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-sentrix-bg text-sentrix-text">
      {/* Top Header */}
      <Header
        activeScenarioName={activeScenarioName}
        modelStatus={health?.model_provider_status || "ONLINE"}
        onOpenDecisionBrief={handleOpenDecisionBrief}
        onOpenSystemHealth={() => setHealthModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Operational Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab === "decision_brief") {
              handleOpenDecisionBrief();
            } else if (tab === "system_health") {
              setHealthModalOpen(true);
            }
          }}
        />

        {/* Center Workspace Viewport */}
        <main className="flex-1 flex flex-col overflow-hidden relative p-2 bg-[#090b10]">
          {/* Sub-view switcher for Command Center */}
          {currentTab === "command_center" && (
            <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-sentrix-surface/90 backdrop-blur border border-sentrix-border rounded p-1 text-xs font-mono">
              <button
                onClick={() => setCenterSubView("map")}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 transition ${
                  centerSubView === "map"
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Geospatial Map</span>
              </button>
              <button
                onClick={() => setCenterSubView("dependency_graph")}
                className={`px-2.5 py-1 rounded flex items-center space-x-1 transition ${
                  centerSubView === "dependency_graph"
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Dependency Topology</span>
              </button>
            </div>
          )}

          {/* Conditional Center Screen Rendering */}
          <div className="flex-1 w-full h-full relative overflow-hidden">
            {currentTab === "incident_intake" ? (
              <IncidentIntake
                incident={incident}
                onUpdateIncident={(upd) => setIncident(upd)}
                onRunSimulation={(upd) => {
                  handleSelectScenario(selectedScenarioId, upd);
                  setCurrentTab("command_center");
                }}
                loading={loading}
              />
            ) : currentTab === "scenario_lab" ? (
              <ScenarioLab
                evaluations={evaluations}
                selectedScenarioId={selectedScenarioId}
                onSelectScenario={(sId) => {
                  handleSelectScenario(sId);
                  setCurrentTab("command_center");
                }}
                activePreset={activePreset}
                onSelectPreset={handleSelectPreset}
              />
            ) : centerSubView === "dependency_graph" || currentTab === "cascade_simulation" ? (
              <DependencyGraphView
                assets={graphData?.assets || []}
                dependencies={graphData?.dependencies || []}
                currentStepMetrics={currentStepMetrics}
                selectedAssetId={selectedAsset?.id || null}
                onSelectAsset={(a) => setSelectedAsset(a)}
              />
            ) : (
              <InfrastructureMap
                assets={graphData?.assets || []}
                dependencies={graphData?.dependencies || []}
                currentStepMetrics={currentStepMetrics}
                selectedAssetId={selectedAsset?.id || null}
                onSelectAsset={(a) => setSelectedAsset(a)}
                epicenter={incident?.epicenter || [40.7150, -74.0090]}
                floodRadius={incident?.radius_meters || 1400.0}
              />
            )}
          </div>

          {/* Bottom Simulation Timeline Scrubber */}
          <TimelineController
            simulationRun={simulationRun}
            currentStepIndex={currentStepIndex}
            onStepChange={(idx) => setCurrentStepIndex(idx)}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onReset={() => {
              setCurrentStepIndex(0);
              setIsPlaying(false);
            }}
          />
        </main>

        {/* Right AI Intelligence Panel */}
        <IntelligencePanel
          incident={incident}
          intelligence={intelligence}
          selectedAsset={selectedAsset}
          currentAssetState={selectedAsset ? currentStepMetrics?.asset_states[selectedAsset.id] : undefined}
          onClearSelectedAsset={() => setSelectedAsset(null)}
        />
      </div>

      {/* Decision Brief Modal */}
      <DecisionBriefModal
        brief={decisionBrief}
        isOpen={briefModalOpen}
        onClose={() => setBriefModalOpen(false)}
      />

      {/* System Health Modal */}
      <SystemHealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
      />
    </div>
  );
}

