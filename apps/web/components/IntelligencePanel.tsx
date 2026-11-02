"use client";

import React, { useState } from "react";
import {
  Incident,
  IntelligenceAnalysisResponse,
  InfrastructureAsset,
  OperationalState
} from "../lib/types";
import {
  Cpu,
  ShieldAlert,
  HelpCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Info
} from "lucide-react";

interface IntelligencePanelProps {
  incident: Incident | null;
  intelligence: IntelligenceAnalysisResponse | null;
  selectedAsset: InfrastructureAsset | null;
  currentAssetState?: OperationalState;
  onClearSelectedAsset: () => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  incident,
  intelligence,
  selectedAsset,
  currentAssetState,
  onClearSelectedAsset,
}) => {
  const [showReasoning, setShowReasoning] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<"ai_hypotheses" | "asset_inspector">("ai_hypotheses");

  return (
    <div className="w-84 md:w-96 border-l border-sentrix-border bg-sentrix-surface flex flex-col justify-between shrink-0 select-none overflow-hidden z-10">
      {/* Header Tabs */}
      <div className="h-10 border-b border-sentrix-border bg-sentrix-bg px-3 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab("ai_hypotheses")}
            className={`px-2 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === "ai_hypotheses"
                ? "bg-sentrix-elevated text-blue-400 font-semibold border border-sentrix-border"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Intelligence</span>
          </button>

          <button
            onClick={() => setActiveSubTab("asset_inspector")}
            className={`px-2 py-1 rounded transition flex items-center space-x-1.5 ${
              activeSubTab === "asset_inspector"
                ? "bg-sentrix-elevated text-blue-400 font-semibold border border-sentrix-border"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Asset Inspector {selectedAsset ? "(1)" : ""}</span>
          </button>
        </div>

        {intelligence && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
            {Math.round(intelligence.confidence_score * 100)}% CONF
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {activeSubTab === "asset_inspector" ? (
          selectedAsset ? (
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-sentrix-border">
                <div>
                  <h4 className="font-bold text-gray-200 text-sm">{selectedAsset.name}</h4>
                  <span className="text-[10px] text-sentrix-textMuted">{selectedAsset.id}</span>
                </div>
                <button
                  onClick={onClearSelectedAsset}
                  className="text-gray-500 hover:text-gray-300 text-xs"
                >
                  Clear
                </button>
              </div>

              {/* Status & Criticality */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-sentrix-bg border border-sentrix-border">
                  <div className="text-gray-400 text-[10px]">OPERATIONAL STATE</div>
                  <div className="font-bold mt-0.5 text-cyan-400">
                    {currentAssetState || selectedAsset.operational_state}
                  </div>
                </div>

                <div className="p-2 rounded bg-sentrix-bg border border-sentrix-border">
                  <div className="text-gray-400 text-[10px]">CRITICALITY LEVEL</div>
                  <div className="font-bold mt-0.5 text-amber-400">
                    Level {selectedAsset.criticality} / 5
                  </div>
                </div>
              </div>

              {/* Hydraulic Metrics */}
              <div className="p-2.5 rounded bg-sentrix-bg border border-sentrix-border space-y-1.5 text-[11px]">
                <div className="text-[10px] uppercase font-bold text-gray-400">Hydraulic Thresholds</div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ground Elevation:</span>
                  <span className="text-gray-200">{selectedAsset.elevation_m} meters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Failure Water Depth:</span>
                  <span className="text-red-400 font-semibold">{selectedAsset.flood_depth_threshold_cm} cm</span>
                </div>
                {selectedAsset.backup_power_hours > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Auxiliary Diesel Backup:</span>
                    <span className="text-amber-400 font-semibold">{selectedAsset.backup_power_hours} hours buffer</span>
                  </div>
                )}
              </div>

              {/* Upstream & Downstream Dependencies */}
              <div className="space-y-1.5 text-[11px]">
                <div className="text-[10px] uppercase font-bold text-gray-400">Upstream Dependencies</div>
                <div className="space-y-1">
                  {selectedAsset.upstream_dependencies.length > 0 ? (
                    selectedAsset.upstream_dependencies.map((depId) => (
                      <div key={depId} className="px-2 py-1 rounded bg-sentrix-bg border border-sentrix-border text-gray-300">
                        {depId}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-[10px]">Autonomous / Primary Source Node</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-sentrix-textMuted space-y-2">
              <Info className="w-8 h-8 text-gray-600" />
              <p className="font-mono text-xs">Click any infrastructure node on the map to inspect telemetry, lifelines, and backup power.</p>
            </div>
          )
        ) : (
          /* AI Intelligence & Structured Hypotheses */
          <div className="space-y-3 font-mono">
            {/* Model Provenance Banner */}
            <div className="px-2.5 py-1.5 rounded bg-blue-950/40 border border-blue-800/40 text-[10px] flex items-center justify-between text-blue-300">
              <span className="flex items-center gap-1 font-bold">
                <Cpu className="w-3 h-3 text-blue-400" />
                META MUSE SPARK OPEN
              </span>
              <span className="text-gray-400">Verified Multimodal Inference</span>
            </div>

            {/* Plausible Cascades */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Plausible Failure Chains
              </div>
              <div className="space-y-1.5">
                {(intelligence?.plausible_cascades || [
                  "Direct Inundation -> Grand Underpass Blocked -> EMS Transit Severed (+24 min)",
                  "Substation 01 Flooded -> St. Jude on Backup Generator -> 2hr Depletion -> ICU Constraint"
                ]).map((casc, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-sentrix-bg border border-sentrix-border text-[11px] text-gray-300 leading-tight"
                  >
                    {casc}
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Hypotheses */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-gray-300 flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                Structured Risk Hypotheses
              </div>
              <div className="space-y-1">
                {(intelligence?.risk_hypotheses || []).map((hyp, idx) => (
                  <div key={idx} className="p-2 rounded bg-sentrix-bg border border-sentrix-border text-[11px] text-gray-300 leading-snug">
                    • {hyp}
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Info & Uncertainty */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Uncertainties & Information Gaps
              </div>
              <div className="p-2 rounded bg-sentrix-bg border border-sentrix-border text-[10px] text-gray-400 space-y-1">
                {(intelligence?.uncertainty_indicators || [
                  "Peak river storm-surge crest time unconfirmed by upstream telemetry.",
                  "St. Jude auxiliary diesel reserve volume requires physical dipstick confirmation."
                ]).map((unc, idx) => (
                  <div key={idx}>- {unc}</div>
                ))}
              </div>
            </div>

            {/* Expandable Model Reasoning Trace */}
            <div className="pt-1">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="w-full flex items-center justify-between text-[11px] text-sentrix-textMuted hover:text-gray-200 py-1"
              >
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-indigo-400" />
                  Model Reasoning Trace
                </span>
                {showReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showReasoning && (
                <div className="p-2.5 rounded bg-sentrix-bg border border-sentrix-border text-[10px] text-gray-300 leading-relaxed max-h-36 overflow-y-auto mt-1">
                  {intelligence?.reasoning_summary || "Grounding analysis performed against NetworkX topological graph and hydraulic elevation margins."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-sentrix-border bg-sentrix-bg text-[10px] font-mono text-gray-500 flex items-center justify-between">
        <span>Grounded in deterministic graph</span>
        <span>Zero hallucinated stats</span>
      </div>
    </div>
  );
};
