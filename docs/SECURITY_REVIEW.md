# SENTRIX — Production Security Review & Threat Assessment

> **Platform:** SENTRIX Infrastructure Resilience Intelligence  
> **Security Baseline:** Meta Production Engineering & Municipal Resilience Standards  
> **Date:** November 2026

---

## 1. Executive Summary

SENTRIX is an operational decision-support platform designed for emergency operations centers (EOC) and infrastructure operators. Because emergency decisions carry acute life-safety implications, the security architecture prioritizes:
1. **Zero Secret Leakage** across all repositories, artifacts, and network payloads.
2. **Defensive AI Integration** where LLM outputs are treated as untrusted text and cannot execute code, mutate databases directly, or fabricate physical reality.
3. **Strict Human-in-the-Loop Authority** preventing autonomous execution of deployment orders.

---

## 2. Credential & Secret Management

### 2.1 Git Repository Protection
- All API keys, tokens, and local certificates reside strictly in `.env`, which is permanently excluded via `.gitignore`:
  ```gitignore
  .env
  .env.*
  !.env.example
  !.env.template
  ```
- Before every commit, automated and manual scans verify that no live keys (`BASETEN_API_KEY`, Bearer tokens, or certificates) exist in the Git index or working tree.
- `apps/web` environment configuration uses `NEXT_PUBLIC_API_URL` solely for routing to the backend gateway; `BASETEN_API_KEY` is never exposed with a `NEXT_PUBLIC_` prefix and is physically inaccessible to the browser bundle.

### 2.2 Server-Side Secret Handling
- In `apps/api/sentrix/intelligence/provider.py`, the API key is retrieved via `os.getenv("BASETEN_API_KEY")`.
- When communicating with Baseten's inference gateway, authentication headers (`Authorization: Api-Key <token>`) are injected via HTTPX client sessions that are destroyed upon completion.
- Endpoint health checks (`/api/v1/health`) return connection status (`ONLINE`, `UNCONFIGURED`, `OFFLINE`) and provider metadata **without echoing the key or key fragments**.

---

## 3. Threat Model & AI Safety Architecture

| Threat Vector | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Model Hallucination of Physical Metrics** | Critical | Physical simulation is strictly decoupled from language models. All flood heights, component operational states, transit delays, and MCDA scores are calculated deterministically by NetworkX in Python. The LLM only interprets qualitative sensor text and generates narrative summaries. |
| **Prompt Injection / Malicious Telemetry** | High | User-supplied incident descriptions and sensor evidence are fed into structured prompts with rigid JSON schemas. Outputs are defensively parsed using Pydantic schemas (`IntelligenceAnalysisResponse`). Malformed or injected instructions fail schema validation and fall back to grounded deterministic defaults. |
| **Remote Code Execution (RCE) via LLM Output** | Critical | LLM outputs are never passed to `eval()`, `exec()`, shell runners, SQL queries, or file system mutation routines. They are treated solely as structured display data. |
| **Internal Scratchpad / Reasoning Leakage** | Medium | The inference provider never exposes, logs, or persists raw `reasoning_content` from the model. Responses are strictly parsed and validated against structured Pydantic schemas (`MuseAnalysisPayload`, `MuseExplanationPayload`), and only verified operational rationale summaries are returned. |
| **Denial of Service / Token Starvation** | Medium | Inference calls enforce granular HTTP timeouts (5s connect, 25s read, 35s total), bounded retries with exponential backoff on 429/503, fail-fast behavior on 401/403, and token budgets ($\le 4096$ tokens to accommodate reasoning and complete structured JSON output). If the external inference provider times out or fails, the backend immediately serves deterministic fallback responses without hanging the API. |
| **Unauthorized Autonomous Actions** | Critical | SENTRIX implements an advisory posture. Recommendations require explicit human operator validation (`operator_signoff_required: true`). The system has no egress hooks to municipal switchgear, SCADA controls, or automated dispatch sirens. |

---

## 4. API Security & Input Sanitization

1. **Schema Validation:**
   All incoming requests (`/api/v1/simulations`, `/api/v1/interventions/compare`) are strictly validated using Pydantic models. Unrecognized fields are rejected or ignored via `ConfigDict(extra="ignore")`.
2. **Numeric Bounds Verification:**
   Parametric calibrations (`custom_flood_depth_cm`, `custom_progression_rate_cm_per_hour`, `custom_radius_meters`) are verified within safe physical boundaries ($0 \le \text{depth} \le 500\text{cm}$, $0 \le \text{rate} \le 100\text{cm/hr}$, $0 \le \text{radius} \le 10000\text{m}$).
3. **CORS Governance:**
   Configured in `main.py` with explicit allowed headers (`*`) and methods (`GET`, `POST`, `OPTIONS`).

---

## 5. Auditability & Provenance Tracking

- Every generated decision brief produces an RFC-3339 timestamped audit object with a cryptographically unique identifier (`brief-{uuid8}`).
- Every narrative output includes explicit `model_provenance` metadata:
  - `LIVE_META_MUSE_SPARK_OPEN`: Output generated by live Meta model inference on Baseten.
  - `VERIFIED_DETERMINISTIC_ENGINE`: Output generated by the deterministic grounded fallback engine.
- Operators can copy the brief in Markdown or download the full audit record in JSON for permanent record-keeping in municipal incident logs.

