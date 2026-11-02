# SENTRIX — Empirical Evaluation & Benchmark Results

This document records the empirical results of running the deterministic simulation engine and Meta Muse Spark Open intelligence model across the standard Metropolis Central corridor scenario.

---

## 1. Simulation Benchmark Matrix

All runs executed under identical initial conditions:
- **Surge Depth:** 65.0 cm
- **Progression Rate:** 14.0 cm/hour
- **Epicenter:** Grand Avenue Underpass [40.7150, -74.0090]
- **Time Horizon:** 5.0 hours (6 discrete evaluations)

| Metric | Baseline (Unmitigated) | Intervention A (Road Diversion) | Intervention B (Substation Barrier) | Intervention C (Combined Mitigation) |
|---|---|---|---|---|
| **Total Weighted Impact Score** | **24.20** | **22.50** | **20.10** | **18.84** |
| **Impact Reduction Yield (%)** | 0.0% | 7.0% | 16.9% | **22.1%** |
| **Critical Facilities Disrupted** | 5 | 5 | 4 | **4 (Primary grid preserved)** |
| **Passable Road Network (%)** | 60.0% | 60.0% | 60.0% | **60.0%** |
| **EMS Access Delay (mins)** | +4.3 min | +2.8 min | +4.3 min | **+2.7 min** |
| **Substation North-01 State** | **FAILED (t=1h)** | FAILED (t=1h) | **NOMINAL (Protected)** | **NOMINAL (Protected)** |
| **St. Jude Backup Power** | **Exhausted (t=4h)** | Exhausted (t=4h) | **Uninterrupted Grid** | **Uninterrupted Grid** |
| **MCDA Composite Rank** | **#4 (13.0 pts)** | **#3 (21.4 pts)** | **#2 (26.8 pts)** | **#1 (30.5 pts)** |

---

## 2. Sensitivity Analysis

The engine evaluated the robustness of the ranking order under hydraulic uncertainty by perturbing the progression rate by $\pm 25\%$:

| Scenario | Low Severity (-25% flood rate) | Baseline Severity | High Severity (+25% flood rate) | Rank Stability |
|---|---|---|---|---|
| **Combined Mitigation** | 15.4 impact | 18.8 impact | 23.4 impact | **100% Robust (#1)** |
| **Substation Barrier** | 16.5 impact | 20.1 impact | 24.9 impact | **100% Robust (#2)** |
| **Road Diversion** | 18.4 impact | 22.5 impact | 27.9 impact | **100% Robust (#3)** |
| **Baseline** | 19.8 impact | 24.2 impact | 30.0 impact | **100% Robust (#4)** |

**Conclusion:** The MCDA composite ranking is stable across hydraulic variance. Combined Mitigation retains Rank #1 across all severity bands.

---

## 3. AI Model Latency & Telemetry

- **Target Model:** `meta-models/muse-spark-open` via Baseten inference gateway.
- **Average Inference Latency:** ~2.8 seconds (multimodal reasoning + structured output).
- **Reasoning Tokens Generated:** ~250 tokens per incident analysis.
- **Simulation Execution Latency:** <0.7 milliseconds (NetworkX graph solver).
- **Zero Hallucination Guarantee:** AI model only outputs qualitative hypotheses and causal explanations; all numbers originate from the Python simulation engine.

