"use client";

import React, { useState, useMemo } from "react";
import {
  InfrastructureAsset,
  InfrastructureDependency,
  OperationalState,
  StepMetrics
} from "../lib/types";
import {
  ShieldAlert,
  Zap,
  Activity,
  Layers,
  Maximize2,
  Minimize2,
  Navigation,
  AlertTriangle,
  Radio,
  Flame,
  Truck
} from "lucide-react";

interface InfrastructureMapProps {
  assets: InfrastructureAsset[];
  dependencies: InfrastructureDependency[];
  currentStepMetrics?: StepMetrics;
  selectedAssetId: string | null;
  onSelectAsset: (asset: InfrastructureAsset) => void;
  epicenter: [number, number];
  floodRadius: number;
}

export const InfrastructureMap: React.FC<InfrastructureMapProps> = ({
  assets,
  dependencies,
  currentStepMetrics,
  selectedAssetId,
  onSelectAsset,
  epicenter,
  floodRadius,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showPowerLines, setShowPowerLines] = useState<boolean>(true);
  const [showWaterLines, setShowWaterLines] = useState<boolean>(true);

  // Geographic bounds mapping to SVG coordinate space
  // Center: [40.7150, -74.0090]
  // Lat range: 40.7060 to 40.7240 (1800m north-south)
  // Lon range: -74.0200 to -74.0000 (1700m east-west)
  const mapBounds = {
    minLat: 40.7060,
    maxLat: 40.7240,
    minLon: -74.0200,
    maxLon: -74.0000,
  };

  const project = (lat: number, lon: number): [number, number] => {
    const x = ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * 900;
    const y = 600 - ((lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * 600;
    return [x, y];
  };

  const assetsMap = useMemo(() => {
    const m = new Map<string, InfrastructureAsset>();
    assets.forEach((a) => m.set(a.id, a));
    return m;
  }, [assets]);

  // Asset state from current simulation step
  const getAssetState = (assetId: string): OperationalState => {
    if (currentStepMetrics?.asset_states && currentStepMetrics.asset_states[assetId]) {
      return currentStepMetrics.asset_states[assetId];
    }
    const a = assetsMap.get(assetId);
    return a ? a.operational_state : "NOMINAL";
  };

  const getStateColor = (state: OperationalState): string => {
    switch (state) {
      case "NOMINAL":
        return "#0ea5e9"; // cyan/teal
      case "DEGRADED":
        return "#f59e0b"; // amber
      case "FAILED":
        return "#ef4444"; // crimson red
      case "ISOLATED":
        return "#ec4899"; // pink/isolated
      default:
        return "#94a3b8";
    }
  };

  const [epiX, epiY] = project(epicenter[0], epicenter[1]);
  // Pixel radius corresponding to floodRadius in meters (~1700m = 900px => ~0.53 px/m)
  const epiPixelRadius = (floodRadius / 1700) * 800;

  const delayMinutes = currentStepMetrics?.access_delay_proxy_minutes ?? 0;
  const underpassState = getAssetState("junction-grand-underpass");
  const isUnderpassSevered = underpassState === "FAILED" || delayMinutes > 5;

  const directRoutePoints = useMemo(() => {
    const ids = ["ems-station-04", "junction-4th-ave-bridge", "junction-grand-underpass", "junction-hospital-gate", "hospital-st-jude"];
    return ids.map((id) => assetsMap.get(id)).filter((a): a is InfrastructureAsset => !!a).map((a) => project(a.lat, a.lon).join(",")).join(" ");
  }, [assetsMap]);

  const detourRoutePoints = useMemo(() => {
    const ids = ["ems-station-04", "junction-4th-ave-bridge", "junction-market-st", "junction-northway-ridge", "junction-hospital-gate", "hospital-st-jude"];
    return ids.map((id) => assetsMap.get(id)).filter((a): a is InfrastructureAsset => !!a).map((a) => project(a.lat, a.lon).join(",")).join(" ");
  }, [assetsMap]);

  return (
    <div className="relative w-full h-full bg-[#090b10] overflow-hidden rounded border border-sentrix-border flex flex-col">
      {/* Top Map Overlay Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
        <div className="px-3 py-1.5 rounded bg-sentrix-surface/90 backdrop-blur border border-sentrix-border text-xs font-mono text-gray-300 flex items-center space-x-2 shadow-lg">
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span>METROPOLIS CENTRAL DIGITAL TWIN</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">{assets.length} NODES</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">{dependencies.length} LIFELINES</span>
        </div>

        {/* Layer Toggles */}
        <button
          onClick={() => setShowPowerLines(!showPowerLines)}
          className={`px-2.5 py-1 rounded text-[11px] font-mono border transition flex items-center gap-1 ${
            showPowerLines
              ? "bg-amber-950/40 text-amber-300 border-amber-600/40"
              : "bg-sentrix-surface/80 text-gray-400 border-sentrix-border"
          }`}
        >
          <Zap className="w-3 h-3" /> Power Grid
        </button>

        <button
          onClick={() => setShowWaterLines(!showWaterLines)}
          className={`px-2.5 py-1 rounded text-[11px] font-mono border transition flex items-center gap-1 ${
            showWaterLines
              ? "bg-blue-950/40 text-blue-300 border-blue-600/40"
              : "bg-sentrix-surface/80 text-gray-400 border-sentrix-border"
          }`}
        >
          <Activity className="w-3 h-3" /> Water Service
        </button>
      </div>

      {/* Dynamic Route & Incident Status Banner */}
      <div className="absolute top-3 right-3 z-10">
        {isUnderpassSevered ? (
          <div className="px-3 py-1.5 rounded bg-red-950/90 border border-red-600/60 backdrop-blur text-xs font-mono text-red-200 flex items-center space-x-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold">TRANSIT DETOUR ACTIVE:</span>
            <span className="text-gray-200">
              Grand Underpass Inundated • Detour via Northway Ridge (+{delayMinutes > 0 ? delayMinutes.toFixed(1) : "2.7"}m delay)
            </span>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded bg-emerald-950/90 border border-emerald-600/60 backdrop-blur text-xs font-mono text-emerald-200 flex items-center space-x-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold">PRIMARY TRANSIT NOMINAL:</span>
            <span className="text-gray-200">Direct EMS Corridor Open (3.5m transit)</span>
          </div>
        )}
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-10 px-3 py-2 rounded bg-sentrix-surface/90 backdrop-blur border border-sentrix-border text-[11px] font-mono space-y-1 text-gray-300 shadow-lg">
        <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Operational State</div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Nominal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Degraded
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Failed / Flooded
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Isolated
          </span>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="w-full h-full flex items-center justify-center p-2">
        <svg
          viewBox="0 0 900 600"
          className="w-full h-full max-h-[580px] select-none"
          style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.2s ease" }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#161b26" strokeWidth="0.8" />
            </pattern>

            {/* Radial Flood Gradient */}
            <radialGradient id="floodGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </radialGradient>
          </defs>

          {/* Background Grid */}
          <rect width="900" height="600" fill="url(#grid)" />

          {/* River Representation */}
          <path
            d="M 50 200 C 250 240, 380 320, 520 380 S 780 430, 880 460"
            fill="none"
            stroke="#111c2e"
            strokeWidth="38"
            strokeLinecap="round"
          />
          <path
            d="M 50 200 C 250 240, 380 320, 520 380 S 780 430, 880 460"
            fill="none"
            stroke="#1d2d47"
            strokeWidth="8"
            strokeDasharray="12,6"
            strokeLinecap="round"
          />

          {/* Dynamic Flood Inundation Polygon */}
          <circle
            cx={epiX}
            cy={epiY}
            r={epiPixelRadius}
            fill="url(#floodGrad)"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            className="animate-pulse"
          />

          {/* Epicenter Marker */}
          <circle cx={epiX} cy={epiY} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          <text
            x={epiX + 10}
            y={epiY - 8}
            fill="#f87171"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            SURGE EPICENTER [65cm]
          </text>

          {/* Physical Road Edges */}
          {dependencies
            .filter((d) => d.dependency_type === "PHYSICAL_ROAD" || d.dependency_type === "EMERGENCY_ACCESS")
            .map((dep) => {
              const u = assetsMap.get(dep.source_asset_id);
              const v = assetsMap.get(dep.target_asset_id);
              if (!u || !v) return null;

              const [x1, y1] = project(u.lat, u.lon);
              const [x2, y2] = project(v.lat, v.lon);

              const stateU = getAssetState(u.id);
              const stateV = getAssetState(v.id);
              const isSevered = stateU === "FAILED" || stateV === "FAILED";

              return (
                <g key={dep.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isSevered ? "#ef4444" : "#2d3748"}
                    strokeWidth={isSevered ? 3.5 : 2.5}
                    strokeDasharray={isSevered ? "6,4" : undefined}
                  />
                  {/* Emergency Access Highlight */}
                  {dep.dependency_type === "EMERGENCY_ACCESS" && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#38bdf8"
                      strokeWidth="3.5"
                      strokeOpacity="0.75"
                    />
                  )}
                </g>
              );
            })}

          {/* Dynamic Active Ambulance Trajectory Overlay */}
          {isUnderpassSevered ? (
            <g>
              <polyline
                points={detourRoutePoints}
                fill="none"
                stroke="#10b981"
                strokeWidth="4.5"
                strokeDasharray="8,5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.85"
                className="animate-pulse"
              />
              <polyline
                points={detourRoutePoints}
                fill="none"
                stroke="#34d399"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.9"
              />
            </g>
          ) : (
            <g>
              <polyline
                points={directRoutePoints}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeDasharray="6,4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.85"
              />
            </g>
          )}

          {/* Power Grid Lines */}
          {showPowerLines &&
            dependencies
              .filter((d) => d.dependency_type === "POWER_GRID")
              .map((dep) => {
                const u = assetsMap.get(dep.source_asset_id);
                const v = assetsMap.get(dep.target_asset_id);
                if (!u || !v) return null;

                const [x1, y1] = project(u.lat, u.lon);
                const [x2, y2] = project(v.lat, v.lon);
                const isSubFailed = getAssetState(u.id) === "FAILED";

                return (
                  <line
                    key={dep.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isSubFailed ? "#7f1d1d" : "#eab308"}
                    strokeWidth="1.8"
                    strokeDasharray="4,4"
                    strokeOpacity={isSubFailed ? 0.4 : 0.85}
                  />
                );
              })}

          {/* Water Service Lines */}
          {showWaterLines &&
            dependencies
              .filter((d) => d.dependency_type === "WATER_SERVICE")
              .map((dep) => {
                const u = assetsMap.get(dep.source_asset_id);
                const v = assetsMap.get(dep.target_asset_id);
                if (!u || !v) return null;

                const [x1, y1] = project(u.lat, u.lon);
                const [x2, y2] = project(v.lat, v.lon);

                return (
                  <line
                    key={dep.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="2,4"
                    strokeOpacity="0.7"
                  />
                );
              })}

          {/* Asset Node Markers */}
          {assets.map((asset) => {
            const [x, y] = project(asset.lat, asset.lon);
            const state = getAssetState(asset.id);
            const stateColor = getStateColor(state);
            const isSelected = selectedAssetId === asset.id;

            return (
              <g
                key={asset.id}
                onClick={() => onSelectAsset(asset)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                {/* Selection Halo */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r="18"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                    className="animate-spin"
                  />
                )}

                {/* Node Outer Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={asset.criticality >= 4 ? 12 : 9}
                  fill="#121620"
                  stroke={stateColor}
                  strokeWidth={asset.criticality === 5 ? "3.5" : "2.5"}
                />

                {/* Inner Status Dot */}
                <circle cx={x} cy={y} r={asset.criticality >= 4 ? 5 : 3.5} fill={stateColor} />

                {/* Criticality Badge for Key Assets */}
                {asset.criticality >= 4 && (
                  <rect
                    x={x + 10}
                    y={y - 14}
                    width="18"
                    height="12"
                    rx="2"
                    fill="#1e2333"
                    stroke={stateColor}
                    strokeWidth="1"
                  />
                )}
                {asset.criticality >= 4 && (
                  <text
                    x={x + 19}
                    y={y - 5}
                    textAnchor="middle"
                    fill="#f3f4f6"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    L{asset.criticality}
                  </text>
                )}

                {/* Node Label */}
                <text
                  x={x}
                  y={y + 22}
                  textAnchor="middle"
                  fill={isSelected ? "#38bdf8" : "#cbd5e1"}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={asset.criticality >= 4 ? "bold" : "normal"}
                  className="pointer-events-none drop-shadow"
                >
                  {asset.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

