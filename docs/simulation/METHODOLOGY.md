# SENTRIX — Simulation Methodology & Mathematical Foundations

This document provides the formal mathematical formulation governing the deterministic cascading-failure simulation engine and the Multi-Criteria Decision Analysis (MCDA) intervention ranking engine.

---

## 1. Urban Infrastructure Graph Formalization

Let the municipal infrastructure digital twin be modeled as an attributed mixed graph:
$$G = (V, E_P, E_D)$$

Where:
- $V$: Set of infrastructure assets (nodes).
- $E_P$: Undirected physical road segments connecting junctions and facilities.
- $E_D$: Directed functional dependency lifelines $(u, v) \in E_D$, indicating that target node $v$ relies on source node $u$ for service continuity.

Each asset $a \in V$ is parameterized by:
- $L_a = (\text{lat}_a, \text{lon}_a)$: Geographic coordinates.
- $h_a$: Ground surface elevation above municipal datum in meters.
- $\theta_a$: Critical flood inundation failure threshold in centimeters.
- $B_a$: Auxiliary backup power duration in hours (e.g. emergency hospital generator).
- $C_a \in \{1, 2, 3, 4, 5\}$: Criticality tier.
- $\sigma_a(t) \in \{\text{NOMINAL}, \text{DEGRADED}, \text{FAILED}, \text{ISOLATED}\}$: Operational state at time $t$.

---

## 2. Inundation Attenuation & Dynamic Exposure

Let the flood incident be characterized by epicenter $E_0 = (\text{lat}_0, \text{lon}_0)$, initial surge depth $D_0$ (cm), progression velocity $v_f$ (cm/h), and impact radius $R$ (m).

The spatial distance between asset $a$ and the epicenter is calculated using the spherical Haversine formula:
$$d(a, E_0) = 2 R_{\text{earth}} \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_a)\cos(\phi_0)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$

The spatial attenuation coefficient $S(a)$ is defined as:
$$S(a) = \max\left(0, 1 - \frac{d(a, E_0)}{R}\right)$$

At discrete time step $t \in \{0, 1, 2, 3, 4, 5\}$, the effective hydraulic flood depth $W(a, t)$ acting upon asset $a$ is:
$$W(a, t) = \max\left(0, (D_0 + t \cdot v_f) \cdot S(a) - \max(0, (h_a - 2.0) \cdot 12.0) - P_a(t)\right)$$

Where:
- $P_a(t)$ represents active physical barrier mitigation deployed at asset $a$ at or before time $t$.

---

## 3. Discrete State Transitions & Dependency Propagation

### Direct Inundation Rule:
$$\sigma_a(t) \leftarrow \begin{cases}
\text{FAILED} & \text{if } W(a, t) \ge \theta_a \\
\text{DEGRADED} & \text{if } 0.6 \theta_a \le W(a, t) < \theta_a \\
\text{NOMINAL} & \text{otherwise}
\end{cases}$$

### Electrical Lifeline Dependency Rule:
For any asset $v$ dependent on electrical substation $u$ through power lifeline $(u, v) \in E_D$:
$$\text{If } \sigma_u(t) = \text{FAILED}:$$
$$\text{If } B_v(t) > 0 \implies \sigma_v(t) \leftarrow \text{DEGRADED}, \quad B_v(t + \Delta t) \leftarrow B_v(t) - \Delta t$$
$$\text{If } B_v(t) \le 0 \implies \sigma_v(t) \leftarrow \begin{cases}
\text{DEGRADED (ICU constraint)} & \text{if } \text{type}(v) = \text{HOSPITAL} \\
\text{FAILED} & \text{otherwise}
\end{cases}$$

### Dynamic Shortest Path & Accessibility Routing:
Let $G_{\text{passable}}(t) \subset E_P$ be the subgraph of road segments where neither endpoint is in state $\text{FAILED}$.
Using Dijkstra's algorithm, the transit delay $\tau_{\text{transit}}(t)$ between EMS Dispatch and St. Jude Trauma Center is computed as:
$$\tau_{\text{transit}}(t) = \text{DijkstraShortestPath}\left(G_{\text{passable}}(t), v_{\text{ems}}, v_{\text{hospital}}\right)$$

If no path exists ($G_{\text{passable}}(t)$ disconnected):
$$\sigma_{\text{hospital}}(t) \leftarrow \text{ISOLATED}, \quad \tau_{\text{transit}}(t) \leftarrow 28.0 \text{ min (severe penalty)}$$

The access delay proxy is:
$$\Delta \tau(t) = \max(0, \tau_{\text{transit}}(t) - \tau_{\text{nominal}})$$

---

## 4. Multi-Criteria Decision Analysis (MCDA) Ranking

Each intervention scenario $k$ is ranked using an axiomatic multi-attribute utility function:
$$U_k = \left( \sum_{m=1}^{6} w_m \cdot X_{k, m} \right) \times 100$$

Subject to: $\sum_{m=1}^6 w_m = 1.0$

| Dimension ($m$) | Objective | Weight ($w_m$) | Normalization Formula |
|---|---|---|---|
| Critical Asset Protection | Maximize facilities saved | $0.35$ | $(C_{\text{base}} - C_k) / C_{\text{base}}$ |
| Total Impact Reduction | Minimize total system damage | $0.30$ | $(I_{\text{base}} - I_k) / I_{\text{base}}$ |
| Road Accessibility | Preserve passable network | $0.15$ | $R_{\text{passable}, k} / 100.0$ |
| Access Delay Reduction | Minimize ambulance transit delay | $0.10$ | $(\Delta \tau_{\text{base}} - \Delta \tau_k) / \Delta \tau_{\text{base}}$ |
| Deployment Feasibility | Minimize logistical failure risk | $0.05$ | $\max(0.3, 1.0 - \text{cost}_k / 15.0)$ |
| Resource Cost Proxy | Maximize resource efficiency | $0.05$ | $\max(0.2, 1.0 - \text{cost}_k / 10.0)$ |
