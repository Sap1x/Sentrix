"use client";

import React, { useState } from "react";
import { Incident } from "../lib/types";
import { Radio, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw, Send } from "lucide-react";

interface IncidentIntakeProps {
  incident: Incident | null;
  onUpdateIncident: (updated: Incident) => void;
  onRunSimulation: () => void;
  loading: boolean;
}

export const IncidentIntake: React.FC<IncidentIntakeProps> = ({
  incident,
  onUpdateIncident,
  onRunSimulation,
  loading,
}) => {
  const [floodDepth, setFloodDepth] = useState<number>(incident?.flood_depth_cm || 65.0);
  const [progressionRate, setProgressionRate] = useState<number>(incident?.progression_rate_cm_per_hour || 14.0);
  const [radiusMeters, setRadiusMeters] = useState<number>(incident?.radius_meters || 1400.0);

  if (!incident) return null;

  const handleApplyChanges = () => {
    const updated: Incident = {
      ...incident,
      flood_depth_cm: floodDepth,
      progression_rate_cm_per_hour: progressionRate,
      radius_meters: radiusMeters,
    };
    onUpdateIncident(updated);
  };

  return (
    <div className="w-full h-full bg-[#090b10] p-4 overflow-y-auto space-y-4 rounded border border-sentrix-border font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-2 border-b border-sentrix-border">
        <div>
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            Multimodal Incident Intake & Sensor Ingestion
          </h3>
          <p className="text-[11px] text-sentrix-textMuted mt-0.5">
            Real-time urban flood telemetry and first-responder dispatch intake stream.
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800 animate-pulse">
          Active Alert
        </span>
      </div>

      {/* Incident Overview Card */}
      <div className="p-3.5 rounded bg-sentrix-surface border border-sentrix-border space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-gray-100 text-sm">{incident.title}</h4>
            <span className="text-[10px] text-gray-400">ID: {incident.id} • Epicenter: [{incident.epicenter.join(", ")}]</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700 text-[10px] font-bold">
            {incident.severity}
          </span>
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">
          {incident.description}
        </p>
      </div>

      {/* Sensor & Dispatch Evidence Stream */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase font-bold text-gray-300">
          Corroborating Evidence Streams ({incident.evidence.length})
        </div>
        <div className="space-y-2">
          {incident.evidence.map((ev) => (
            <div key={ev.id} className="p-3 rounded bg-sentrix-surface border border-sentrix-border space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-blue-400 font-bold">{ev.source}</span>
                <span className="text-emerald-400 font-semibold">{Math.round(ev.confidence * 100)}% Confidence</span>
              </div>
              <p className="text-xs text-gray-200">{ev.text_content}</p>
              {ev.sensor_reading_cm && (
                <div className="text-[10px] text-amber-400 font-semibold pt-0.5">
                  Telemetry Reading: {ev.sensor_reading_cm} cm
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Parametric Calibration Slider Box */}
      <div className="p-4 rounded bg-sentrix-surface border border-sentrix-border space-y-3">
        <div className="text-[11px] uppercase font-bold text-gray-200">
          Calibrate Flood Parameters & Re-simulate
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Initial Flood Surge Depth:</span>
              <span className="text-red-400 font-bold">{floodDepth} cm</span>
            </div>
            <input
              type="range"
              min={30}
              max={120}
              step={5}
              value={floodDepth}
              onChange={(e) => setFloodDepth(Number(e.target.value))}
              className="w-full accent-red-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Progression Rate:</span>
              <span className="text-amber-400 font-bold">{progressionRate} cm/hour</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={progressionRate}
              onChange={(e) => setProgressionRate(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Surge Radius:</span>
              <span className="text-blue-400 font-bold">{radiusMeters} meters</span>
            </div>
            <input
              type="range"
              min={800}
              max={2500}
              step={100}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={handleApplyChanges}
            className="px-4 py-2 rounded bg-sentrix-elevated hover:bg-sentrix-border text-gray-200 border border-sentrix-border font-medium text-xs transition"
          >
            Apply Parameters
          </button>
          <button
            onClick={() => {
              handleApplyChanges();
              onRunSimulation();
            }}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Re-run Cascading Simulation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
