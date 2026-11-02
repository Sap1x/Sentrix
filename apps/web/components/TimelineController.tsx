"use client";

import React, { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, StepForward, AlertCircle, Clock } from "lucide-react";
import { SimulationRunResult, StepMetrics } from "../lib/types";

interface TimelineControllerProps {
  simulationRun: SimulationRunResult | null;
  currentStepIndex: number;
  onStepChange: (stepIndex: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
}

export const TimelineController: React.FC<TimelineControllerProps> = ({
  simulationRun,
  currentStepIndex,
  onStepChange,
  isPlaying,
  onTogglePlay,
  onReset,
}) => {
  const steps = simulationRun?.timeline_steps || [];
  const currentStep: StepMetrics | undefined = steps[currentStepIndex];
  const maxStep = Math.max(0, steps.length - 1);

  // Auto-advance timeline when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        if (currentStepIndex < maxStep) {
          onStepChange(currentStepIndex + 1);
        } else {
          onTogglePlay(); // Stop when reached end
        }
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStepIndex, maxStep, onStepChange, onTogglePlay]);

  const stepEvents = simulationRun?.events.filter((e) => e.step === currentStepIndex) || [];

  return (
    <div className="h-28 border-t border-sentrix-border bg-sentrix-surface px-4 py-2 flex flex-col justify-between shrink-0 select-none z-10">
      {/* Top Controls & Scrub Bar */}
      <div className="flex items-center justify-between space-x-4">
        {/* Playback Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onReset}
            className="p-1.5 rounded bg-sentrix-bg hover:bg-sentrix-elevated border border-sentrix-border text-gray-300 hover:text-white transition"
            title="Reset to T=0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded font-mono text-xs font-semibold flex items-center space-x-1.5 transition ${
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>CASCADE PLAY</span>
              </>
            )}
          </button>

          <button
            onClick={() => onStepChange(Math.min(maxStep, currentStepIndex + 1))}
            disabled={currentStepIndex >= maxStep}
            className="p-1.5 rounded bg-sentrix-bg hover:bg-sentrix-elevated border border-sentrix-border text-gray-300 hover:text-white transition disabled:opacity-40"
            title="Step Forward"
          >
            <StepForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timeline Horizon Indicator */}
        <div className="flex items-center space-x-2 text-xs font-mono text-gray-300">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>SIMULATION HORIZON:</span>
          <span className="text-blue-400 font-bold">
            T+{currentStep?.time_offset_hours.toFixed(1) || "0.0"} HOURS
          </span>
          <span className="text-gray-500">({currentStepIndex + 1}/{steps.length || 6} STEPS)</span>
        </div>

        {/* Scrubber Range */}
        <div className="flex-1 max-w-md flex items-center space-x-2">
          <span className="text-[10px] font-mono text-gray-400">T+0h</span>
          <input
            type="range"
            min={0}
            max={maxStep}
            step={1}
            value={currentStepIndex}
            onChange={(e) => onStepChange(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
          />
          <span className="text-[10px] font-mono text-gray-400">T+5h</span>
        </div>
      </div>

      {/* Bottom Metric Sparklines & Live Event Ticker */}
      <div className="flex items-center justify-between space-x-4 pt-1 border-t border-sentrix-border/60 text-xs font-mono">
        {/* Metric Cards */}
        <div className="flex items-center space-x-3">
          <div className="px-2.5 py-1 rounded bg-sentrix-bg border border-sentrix-border flex items-center space-x-1.5">
            <span className="text-gray-400 text-[10px]">TOTAL IMPACT:</span>
            <span className="text-red-400 font-bold text-xs">
              {currentStep?.total_weighted_impact.toFixed(1) || "0.0"}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded bg-sentrix-bg border border-sentrix-border flex items-center space-x-1.5">
            <span className="text-gray-400 text-[10px]">CRITICAL FACILITIES DISRUPTED:</span>
            <span className={`font-bold text-xs ${
              (currentStep?.critical_facilities_disrupted || 0) > 0 ? "text-amber-400" : "text-emerald-400"
            }`}>
              {currentStep?.critical_facilities_disrupted || 0}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded bg-sentrix-bg border border-sentrix-border flex items-center space-x-1.5">
            <span className="text-gray-400 text-[10px]">ACCESSIBLE ROADS:</span>
            <span className="text-cyan-400 font-bold text-xs">
              {currentStep?.accessible_road_pct.toFixed(0) || "100"}%
            </span>
          </div>

          <div className="px-2.5 py-1 rounded bg-sentrix-bg border border-sentrix-border flex items-center space-x-1.5">
            <span className="text-gray-400 text-[10px]">ACCESS DELAY:</span>
            <span className={`font-bold text-xs ${
              (currentStep?.access_delay_proxy_minutes || 0) > 5 ? "text-red-400" : "text-gray-200"
            }`}>
              +{currentStep?.access_delay_proxy_minutes.toFixed(1) || "0.0"} min
            </span>
          </div>
        </div>

        {/* Live Event Ticker */}
        <div className="flex-1 overflow-hidden flex items-center space-x-2 text-[11px] text-gray-300">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="truncate">
            {stepEvents.length > 0 ? (
              <span className="text-amber-300 font-mono">
                [T+{currentStep?.time_offset_hours.toFixed(0)}h] {stepEvents[0].description}
                {stepEvents.length > 1 && ` (+${stepEvents.length - 1} more events)`}
              </span>
            ) : (
              <span className="text-gray-500 font-mono">
                [T+{currentStep?.time_offset_hours.toFixed(0)}h] Baseline progression stable; no new state transitions.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

