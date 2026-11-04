"use client";

import React from "react";
import { ComparativeEvaluation } from "../lib/types";
import { Sliders, Award, TrendingDown, Clock, ShieldCheck, Check, DollarSign } from "lucide-react";

interface ScenarioLabProps {
  evaluations: ComparativeEvaluation[];
  selectedScenarioId: string;
  onSelectScenario: (scenarioId: string) => void;
  activePreset?: string;
  onSelectPreset?: (presetId: string, weights: Record<string, number>) => void;
}

export const ScenarioLab: React.FC<ScenarioLabProps> = ({
  evaluations,
  selectedScenarioId,
  onSelectScenario,
  activePreset = "balanced",
  onSelectPreset,
}) => {
  const PRESETS: Record<string, { name: string; icon: string; weights: Record<string, number>; desc: string }> = {
    balanced: {
      name: "Balanced Strategy",
      icon: "⚖️",
      desc: "Equalized trade-off across facility protection, access, and feasibility",
      weights: {
        critical_asset_protection: 0.35,
        impact_reduction: 0.30,
        road_accessibility: 0.15,
        access_delay_reduction: 0.10,
        execution_feasibility: 0.05,
        cost_efficiency: 0.05,
      },
    },
    lifesafety: {
      name: "Life-Safety Priority",
      icon: "🚑",
      desc: "Prioritizes hospital continuity and acute trauma ambulance response time",
      weights: {
        critical_asset_protection: 0.50,
        access_delay_reduction: 0.25,
        impact_reduction: 0.15,
        road_accessibility: 0.10,
        execution_feasibility: 0.00,
        cost_efficiency: 0.00,
      },
    },
    transit: {
      name: "Rapid Transit Focus",
      icon: "⚡",
      desc: "Optimizes municipal arterial flow and minimizes vehicle access delays",
      weights: {
        access_delay_reduction: 0.40,
        road_accessibility: 0.30,
        critical_asset_protection: 0.15,
        impact_reduction: 0.10,
        execution_feasibility: 0.05,
        cost_efficiency: 0.00,
      },
    },
  };

  const currentWeights = PRESETS[activePreset]?.weights || PRESETS.balanced.weights;
  return (
    <div className="w-full h-full bg-[#090b10] p-4 overflow-y-auto space-y-4 rounded border border-sentrix-border font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-sentrix-border">
        <div>
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Counterfactual Scenario Lab & Intervention Ranking
          </h3>
          <p className="text-[11px] text-sentrix-textMuted mt-0.5">
            Deterministic simulation comparisons evaluated via Multi-Criteria Decision Analysis (MCDA).
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800">
          Ranked by Resilience Yield
        </span>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {evaluations.map((ev) => {
          const isSelected = selectedScenarioId === ev.scenario_id;
          const isRank1 = ev.rank === 1;

          return (
            <div
              key={ev.scenario_id}
              onClick={() => onSelectScenario(ev.scenario_id)}
              className={`p-3.5 rounded border cursor-pointer transition-all ${
                isSelected
                  ? "bg-blue-950/30 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                  : "bg-sentrix-surface border-sentrix-border hover:border-sentrix-borderHover"
              }`}
            >
              {/* Header: Title & Rank */}
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isRank1
                          ? "bg-amber-500 text-black shadow-sm"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      #{ev.rank}
                    </span>
                    <h4 className="font-bold text-gray-200 text-xs">{ev.scenario_name}</h4>
                  </div>
                  <span className="text-[10px] text-gray-400 block ml-7">
                    {ev.category}
                  </span>
                </div>

                {isSelected && (
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> ACTIVE
                  </span>
                )}
              </div>

              {/* Quantitative Metrics Matrix */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-sentrix-border/60 text-[11px]">
                <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
                  <span className="text-gray-400 text-[9px] block">MCDA SCORE</span>
                  <span className="font-bold text-blue-400 text-sm">
                    {ev.composite_rank_score.toFixed(1)}
                  </span>
                </div>

                <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
                  <span className="text-gray-400 text-[9px] block">IMPACT REDUCTION</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    -{ev.impact_reduction_pct.toFixed(1)}%
                  </span>
                </div>

                <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
                  <span className="text-gray-400 text-[9px] block">ACCESS DELAY</span>
                  <span className="font-bold text-amber-400 text-sm">
                    +{ev.access_delay_minutes.toFixed(1)}m
                  </span>
                </div>
              </div>

              {/* Rationale & Tradeoffs */}
              <p className="mt-2.5 text-[11px] text-gray-300 leading-snug">
                {ev.ranking_rationale}
              </p>

              {/* Sensitivity Interval */}
              <div className="mt-2 text-[10px] text-sentrix-textMuted flex items-center justify-between">
                <span>Sensitivity Bounds (±25% flood):</span>
                <span className="text-gray-300">
                  {ev.sensitivity_bounds?.impact_low_severity} — {ev.sensitivity_bounds?.impact_high_severity} impact
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MCDA Weight Transparency & Presets Box */}
      <div className="p-3.5 rounded bg-sentrix-surface border border-sentrix-border space-y-3 text-[11px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sentrix-border pb-2.5">
          <div className="text-gray-300 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>MCDA Objective Scoring Presets (Interactive Tuning)</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {Object.entries(PRESETS).map(([key, preset]) => {
              const isActive = activePreset === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelectPreset && onSelectPreset(key, preset.weights)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono border transition flex items-center space-x-1 ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-400 font-bold shadow-sm"
                      : "bg-sentrix-bg text-gray-400 hover:text-gray-200 border-sentrix-border"
                  }`}
                  title={preset.desc}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] text-gray-400">
          <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Critical Assets</span>
            <span className="font-bold text-gray-200">
              {Math.round((currentWeights.critical_asset_protection || 0) * 100)}% weight
            </span>
          </div>
          <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Impact Reduction</span>
            <span className="font-bold text-gray-200">
              {Math.round((currentWeights.impact_reduction || 0) * 100)}% weight
            </span>
          </div>
          <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Road Accessibility</span>
            <span className="font-bold text-gray-200">
              {Math.round((currentWeights.road_accessibility || 0) * 100)}% weight
            </span>
          </div>
          <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Delay Minimization</span>
            <span className="font-bold text-gray-200">
              {Math.round((currentWeights.access_delay_reduction || 0) * 100)}% weight
            </span>
          </div>
          <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Feasibility</span>
            <span className="font-bold text-gray-200">
              {Math.round((currentWeights.execution_feasibility || 0) * 100)}% weight
            </span>
          </div>
          <div className="p-1.5 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Resource Cost</span>
            <span className="font-bold text-gray-200">
              {Math.round((currentWeights.cost_efficiency || 0) * 100)}% weight
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

