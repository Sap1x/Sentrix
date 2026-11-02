"use client";

import React from "react";
import { ComparativeEvaluation } from "../lib/types";
import { Sliders, Award, TrendingDown, Clock, ShieldCheck, Check, DollarSign } from "lucide-react";

interface ScenarioLabProps {
  evaluations: ComparativeEvaluation[];
  selectedScenarioId: string;
  onSelectScenario: (scenarioId: string) => void;
}

export const ScenarioLab: React.FC<ScenarioLabProps> = ({
  evaluations,
  selectedScenarioId,
  onSelectScenario,
}) => {
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

      {/* MCDA Weight Transparency Box */}
      <div className="p-3 rounded bg-sentrix-surface border border-sentrix-border space-y-2 text-[11px]">
        <div className="text-gray-300 font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>MCDA Objective Scoring Weights (Documented & Transparent)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] text-gray-400">
          <div className="p-1 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Critical Assets</span>
            <span className="font-bold text-gray-200">35% weight</span>
          </div>
          <div className="p-1 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Impact Reduction</span>
            <span className="font-bold text-gray-200">30% weight</span>
          </div>
          <div className="p-1 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Road Accessibility</span>
            <span className="font-bold text-gray-200">15% weight</span>
          </div>
          <div className="p-1 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Delay Minimization</span>
            <span className="font-bold text-gray-200">10% weight</span>
          </div>
          <div className="p-1 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Feasibility</span>
            <span className="font-bold text-gray-200">5% weight</span>
          </div>
          <div className="p-1 rounded bg-sentrix-bg border border-sentrix-border">
            <span className="block text-gray-500">Resource Cost</span>
            <span className="font-bold text-gray-200">5% weight</span>
          </div>
        </div>
      </div>
    </div>
  );
};

