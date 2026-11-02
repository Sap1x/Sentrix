"use client";

import React, { useState } from "react";
import { DecisionBrief } from "../lib/types";
import { FileText, X, CheckCircle, ShieldAlert, Cpu, Download, Printer } from "lucide-react";

interface DecisionBriefModalProps {
  brief: DecisionBrief | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DecisionBriefModal: React.FC<DecisionBriefModalProps> = ({
  brief,
  isOpen,
  onClose,
}) => {
  const [signedOff, setSignedOff] = useState<boolean>(false);

  if (!isOpen || !brief) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-sentrix-surface border border-sentrix-border rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-mono text-xs select-none">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-sentrix-border bg-sentrix-bg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm text-gray-100 tracking-wider">
              OPERATIONAL RESILIENCE DECISION BRIEF
            </h3>
            <span className="text-[10px] text-sentrix-textMuted font-mono">
              [{brief.brief_id}]
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-sentrix-border text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-gray-300">
          {/* Executive Summary */}
          <div className="p-3.5 rounded bg-sentrix-bg border border-sentrix-border space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1.5">
              <span>Executive Briefing</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">Incident: {brief.incident_id}</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-200">
              {brief.executive_summary}
            </p>
          </div>

          {/* Key Findings */}
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase font-bold text-gray-200">
              Validated Simulation Findings
            </div>
            <div className="space-y-1">
              {brief.key_findings.map((item, idx) => (
                <div key={idx} className="p-2 rounded bg-sentrix-bg border border-sentrix-border flex items-start space-x-2">
                  <span className="text-blue-400 font-bold">•</span>
                  <span className="text-xs text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Comparative Summary Table */}
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase font-bold text-gray-200">
              Intervention Trade-Off Comparison
            </div>
            <div className="overflow-x-auto rounded border border-sentrix-border">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-sentrix-bg text-gray-400 border-b border-sentrix-border">
                  <tr>
                    <th className="p-2">Rank</th>
                    <th className="p-2">Scenario</th>
                    <th className="p-2">MCDA Score</th>
                    <th className="p-2">Impact Reduction</th>
                    <th className="p-2">Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sentrix-border/50">
                  {brief.comparative_summary.map((ev) => (
                    <tr
                      key={ev.scenario_id}
                      className={ev.rank === 1 ? "bg-blue-950/20 font-semibold" : ""}
                    >
                      <td className="p-2 text-amber-400">#{ev.rank}</td>
                      <td className="p-2 text-gray-200">{ev.scenario_name}</td>
                      <td className="p-2 text-blue-400">{ev.composite_rank_score.toFixed(1)}</td>
                      <td className="p-2 text-emerald-400">-{ev.impact_reduction_pct.toFixed(1)}%</td>
                      <td className="p-2 text-gray-300">+{ev.access_delay_minutes.toFixed(1)}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assumptions & Model Provenance */}
          <div className="p-3 rounded bg-sentrix-bg border border-sentrix-border space-y-1.5 text-[10px] text-gray-400">
            <div className="font-bold text-gray-300 flex items-center justify-between">
              <span>Simulation Assumptions & Provenance</span>
              <span className="text-indigo-400 font-mono flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {brief.model_provenance}
              </span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-gray-400">
              {brief.assumptions_and_limitations.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Operator Signoff Banner */}
          <div className={`p-3.5 rounded border transition flex items-center justify-between ${
            signedOff
              ? "bg-emerald-950/30 border-emerald-600/50"
              : "bg-amber-950/30 border-amber-600/50"
          }`}>
            <div className="space-y-0.5">
              <div className="font-bold text-xs flex items-center gap-1.5">
                <ShieldAlert className={`w-4 h-4 ${signedOff ? "text-emerald-400" : "text-amber-400"}`} />
                <span className={signedOff ? "text-emerald-300" : "text-amber-300"}>
                  {signedOff ? "OPERATOR VALIDATED & LOGGED" : "OPERATOR VALIDATION REQUIRED"}
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                {signedOff
                  ? "Incident Commander verified simulation trade-offs. Actionable deployment authorized."
                  : "All counterfactual actions are advisory simulations requiring human command verification."}
              </p>
            </div>

            <button
              onClick={() => setSignedOff(!signedOff)}
              className={`px-3 py-1.5 rounded font-bold text-xs transition ${
                signedOff
                  ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              }`}
            >
              {signedOff ? "Sign-off Recorded" : "Acknowledge & Sign"}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-sentrix-border bg-sentrix-bg flex items-center justify-between text-xs">
          <span className="text-[10px] text-gray-500">
            Export format: RFC-3339 Compliant Audit Record
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded bg-sentrix-elevated hover:bg-sentrix-border text-gray-300 flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Brief</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
