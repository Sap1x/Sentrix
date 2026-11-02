"use client";

import React from "react";
import {
  LayoutDashboard,
  Radio,
  MapPin,
  GitBranch,
  Sliders,
  FileCheck2,
  Server
} from "lucide-react";

export type ViewTab =
  | "command_center"
  | "incident_intake"
  | "digital_twin"
  | "cascade_simulation"
  | "scenario_lab"
  | "decision_brief"
  | "system_health";

interface SidebarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const navItems: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: "command_center", label: "Command Center", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "incident_intake", label: "Incident Intake", icon: <Radio className="w-4 h-4" /> },
    { id: "digital_twin", label: "Digital Twin", icon: <MapPin className="w-4 h-4" /> },
    { id: "cascade_simulation", label: "Cascade Engine", icon: <GitBranch className="w-4 h-4" /> },
    { id: "scenario_lab", label: "Scenario Lab", icon: <Sliders className="w-4 h-4" /> },
    { id: "decision_brief", label: "Decision Brief", icon: <FileCheck2 className="w-4 h-4" /> },
    { id: "system_health", label: "System Telemetry", icon: <Server className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-52 border-r border-sentrix-border bg-sentrix-surface flex flex-col justify-between p-2 select-none shrink-0 z-10">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-sentrix-textMuted font-semibold">
          Resilience Operations
        </div>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-sentrix-elevated border border-transparent"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Operational Protocol Notice */}
      <div className="p-2.5 rounded bg-sentrix-bg border border-sentrix-border text-[11px] font-mono text-sentrix-textMuted">
        <div className="text-[10px] uppercase font-bold text-gray-300 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Protocol Notice
        </div>
        <p className="leading-tight text-[10px]">
          Decision support only. All counterfactuals require operator validation prior to deployment.
        </p>
      </div>
    </aside>
  );
};
