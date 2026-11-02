"use client";

import React from "react";
import { ShieldAlert, Cpu, Activity, FileText, CheckCircle2 } from "lucide-react";

interface HeaderProps {
  activeScenarioName: string;
  modelStatus: string;
  onOpenDecisionBrief: () => void;
  onOpenSystemHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeScenarioName,
  modelStatus,
  onOpenDecisionBrief,
  onOpenSystemHealth,
}) => {
  return (
    <header className="h-14 border-b border-sentrix-border bg-sentrix-surface px-4 flex items-center justify-between z-20 shrink-0">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 font-mono font-black text-sm tracking-widest shadow-inner">
          SX
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider text-sm text-gray-100 font-mono">
              SENTRIX
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/50">
              v2.4
            </span>
          </div>
          <p className="text-[11px] text-sentrix-textMuted font-medium">
            See the cascade before it happens.
          </p>
        </div>
      </div>

      {/* Center Operational Telemetry */}
      <div className="hidden md:flex items-center space-x-4 text-xs font-mono">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-sentrix-bg border border-sentrix-border">
          <span className="text-gray-400">INCIDENT:</span>
          <span className="text-amber-400 font-semibold flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            RIVERSIDE SURGE [65cm]
          </span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-sentrix-bg border border-sentrix-border">
          <span className="text-gray-400">ACTIVE SCENARIO:</span>
          <span className="text-blue-400 font-semibold truncate max-w-[200px]">
            {activeScenarioName}
          </span>
        </div>
      </div>

      {/* Right Controls & Model Status */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Model Badge */}
        <div
          onClick={onOpenSystemHealth}
          className="cursor-pointer flex items-center space-x-2 px-2.5 py-1 rounded bg-sentrix-elevated border border-sentrix-border hover:border-sentrix-borderHover transition"
          title="Click to inspect model & telemetry health"
        >
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-[11px] text-gray-300">
            Meta Muse Spark Open
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              modelStatus === "ONLINE"
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
            }`}
          />
        </div>

        {/* Action: Open Decision Brief */}
        <button
          onClick={onOpenDecisionBrief}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-sm"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Decision Brief</span>
        </button>

        {/* System Health */}
        <button
          onClick={onOpenSystemHealth}
          className="p-1.5 rounded hover:bg-sentrix-border text-gray-400 hover:text-gray-200 transition"
          title="System Health & Observability"
        >
          <Activity className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

