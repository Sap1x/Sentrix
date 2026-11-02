"use client";

import React from "react";
import {
  InfrastructureAsset,
  InfrastructureDependency,
  OperationalState,
  StepMetrics
} from "../lib/types";
import { GitFork, Zap, Activity, ShieldCheck, ArrowRight, AlertOctagon } from "lucide-react";

interface DependencyGraphViewProps {
  assets: InfrastructureAsset[];
  dependencies: InfrastructureDependency[];
  currentStepMetrics?: StepMetrics;
  selectedAssetId: string | null;
  onSelectAsset: (asset: InfrastructureAsset) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  assets,
  dependencies,
  currentStepMetrics,
  selectedAssetId,
  onSelectAsset,
}) => {
  const assetsMap = new Map(assets.map((a) => [a.id, a]));

  const getAssetState = (assetId: string): OperationalState => {
    if (currentStepMetrics?.asset_states && currentStepMetrics.asset_states[assetId]) {
      return currentStepMetrics.asset_states[assetId];
    }
    const a = assetsMap.get(assetId);
    return a ? a.operational_state : "NOMINAL";
  };

  const getStatusBadge = (state: OperationalState) => {
    switch (state) {
      case "NOMINAL":
        return <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[10px]">NOMINAL</span>;
      case "DEGRADED":
        return <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800 text-[10px]">DEGRADED</span>;
      case "FAILED":
        return <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800 text-[10px]">FAILED</span>;
      case "ISOLATED":
        return <span className="px-1.5 py-0.5 rounded bg-pink-950/60 text-pink-400 border border-pink-800 text-[10px]">ISOLATED</span>;
    }
  };

  // Group dependencies by type
  const powerDeps = dependencies.filter((d) => d.dependency_type === "POWER_GRID");
  const waterDeps = dependencies.filter((d) => d.dependency_type === "WATER_SERVICE");
  const roadDeps = dependencies.filter((d) => d.dependency_type === "PHYSICAL_ROAD" || d.dependency_type === "EMERGENCY_ACCESS");

  return (
    <div className="w-full h-full bg-[#090b10] p-4 overflow-y-auto space-y-4 rounded border border-sentrix-border">
      <div className="flex items-center justify-between pb-2 border-b border-sentrix-border">
        <div className="flex items-center space-x-2">
          <GitFork className="w-4 h-4 text-blue-400" />
          <h3 className="font-mono text-xs font-bold text-gray-200 uppercase tracking-wider">
            Critical Infrastructure Dependency Topology
          </h3>
        </div>
        <span className="text-[11px] font-mono text-sentrix-textMuted">
          Topological Propagation Matrix
        </span>
      </div>

      {/* Grid Lifelines */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 font-semibold">
          <Zap className="w-3.5 h-3.5" />
          <span>Electrical Grid Lifelines (High Voltage Feeders)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {powerDeps.map((dep) => {
            const src = assetsMap.get(dep.source_asset_id);
            const tgt = assetsMap.get(dep.target_asset_id);
            if (!src || !tgt) return null;

            const srcState = getAssetState(src.id);
            const tgtState = getAssetState(tgt.id);
            const isSevered = srcState === "FAILED";

            return (
              <div
                key={dep.id}
                className={`p-2.5 rounded border text-xs font-mono transition flex items-center justify-between ${
                  isSevered
                    ? "bg-red-950/20 border-red-800/40"
                    : "bg-sentrix-surface border-sentrix-border"
                }`}
              >
                <div
                  className="cursor-pointer hover:text-blue-400 font-medium"
                  onClick={() => onSelectAsset(src)}
                >
                  <div>{src.name}</div>
                  <div className="text-[10px] text-gray-400">{getStatusBadge(srcState)}</div>
                </div>

                <div className="flex flex-col items-center px-2">
                  <span className={`text-[10px] ${isSevered ? "text-red-400" : "text-amber-400"}`}>
                    {isSevered ? "GRID SEVERED" : "GRID FEED"}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isSevered ? "text-red-400" : "text-amber-400"}`} />
                </div>

                <div
                  className="cursor-pointer hover:text-blue-400 font-medium text-right"
                  onClick={() => onSelectAsset(tgt)}
                >
                  <div>{tgt.name}</div>
                  <div className="text-[10px] text-gray-400">{getStatusBadge(tgtState)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Water Service Lifelines */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-semibold">
          <Activity className="w-3.5 h-3.5" />
          <span>Water Pressure & Cooling Services</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {waterDeps.map((dep) => {
            const src = assetsMap.get(dep.source_asset_id);
            const tgt = assetsMap.get(dep.target_asset_id);
            if (!src || !tgt) return null;

            const srcState = getAssetState(src.id);
            const tgtState = getAssetState(tgt.id);
            const isSevered = srcState === "FAILED";

            return (
              <div
                key={dep.id}
                className={`p-2.5 rounded border text-xs font-mono transition flex items-center justify-between ${
                  isSevered
                    ? "bg-red-950/20 border-red-800/40"
                    : "bg-sentrix-surface border-sentrix-border"
                }`}
              >
                <div
                  className="cursor-pointer hover:text-blue-400 font-medium"
                  onClick={() => onSelectAsset(src)}
                >
                  <div>{src.name}</div>
                  <div className="text-[10px]">{getStatusBadge(srcState)}</div>
                </div>

                <div className="flex flex-col items-center px-2">
                  <span className={`text-[10px] ${isSevered ? "text-red-400" : "text-cyan-400"}`}>
                    {isSevered ? "SERVICE LOST" : "WATER FEED"}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isSevered ? "text-red-400" : "text-cyan-400"}`} />
                </div>

                <div
                  className="cursor-pointer hover:text-blue-400 font-medium text-right"
                  onClick={() => onSelectAsset(tgt)}
                >
                  <div>{tgt.name}</div>
                  <div className="text-[10px]">{getStatusBadge(tgtState)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Emergency Access Corridor */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-blue-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Emergency Ambulance Response Corridor</span>
        </div>
        <div className="p-3 rounded bg-sentrix-surface border border-sentrix-border space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300 font-semibold">Primary Corridor: Station 4 EMS → Grand Underpass → St. Jude Hospital</span>
            <span className="text-gray-400 text-[11px]">Nominal: 3.5 min (1.4 km)</span>
          </div>

          <div className="flex items-center justify-between bg-sentrix-bg p-2 rounded text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Station 4 EMS</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  getAssetState("junction-grand-underpass") === "FAILED"
                    ? "bg-red-500 animate-ping"
                    : "bg-cyan-400"
                }`}
              />
              <span className={getAssetState("junction-grand-underpass") === "FAILED" ? "text-red-400 font-bold" : ""}>
                Grand Underpass {getAssetState("junction-grand-underpass") === "FAILED" && "[BLOCKED]"}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  getAssetState("hospital-st-jude") === "ISOLATED"
                    ? "bg-pink-500"
                    : getAssetState("hospital-st-jude") === "DEGRADED"
                    ? "bg-amber-500"
                    : "bg-cyan-400"
                }`}
              />
              <span>St. Jude Trauma Center</span>
            </div>
          </div>

          {/* Highland Detour Status */}
          <div className="flex items-center justify-between bg-sentrix-bg p-2 rounded text-xs font-mono border border-blue-900/30">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Northway Ridge Elevated Bypass</span>
            </div>
            <span className="text-blue-400 font-semibold text-[11px]">
              Active Detour (+4.3 min transit delay)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

