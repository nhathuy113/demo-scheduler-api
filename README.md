# Unified Service Scheduler API

A resource-constrained service appointment scheduling platform (Scenario A: The Unified Service Scheduler).

> 🎬 **5-Minute Technical Walkthrough Video:** [**Watch Full Architecture & Live Demo (05:10)**](#-4-technical-walkthrough-video) | [Download MP4](./walkthrough_video_final.mp4)

---

## 1. How to Run

### Prerequisites & Quick Start

```bash
# 1. Start PostgreSQL 16 container
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Run full test suite (12 suites, 45 tests — 100% pass)
pnpm test
```

### Server Management

Convenient Makefile automation is provided:

```bash
make ai-api-restart     # Rebuild and start server in background (port 3001)
make ai-api-status      # Check process status and inspect recent logs
make ai-api-stop        # Terminate server process
make dev                # Start foreground server with hot reload (tsx watch)
```

---

## 2. Pre-Seeded Test Data & Swagger Endpoints

### Documentation & Health Links
- **Interactive Swagger UI:** `http://127.0.0.1:3001/docs`
- **OpenAPI 3.0 Specification:** `http://127.0.0.1:3001/docs/json`
- **Health Check Probe:** `http://127.0.0.1:3001/health`

### Pre-Seeded Test Data (For Instant Swagger "Try It Out")

| Entity | Seeded Value | Context & Behavior |
| :--- | :--- | :--- |
| **Dealership ID** | `D01` | Configured with 2 Bays (`BAY-01`, `BAY-02`) and 2 Techs (`TECH-01`, `TECH-02`). |
| **Vehicle ID / VIN** | `1HGCR2F83HA000000` | Target vehicle identifier for tests (supports ISO 17-char VIN or legacy IDs like `VEH-00123`). Returns `[]` until first booking is created on fresh database. |
| **Customer ID** | `CUST-01` | Customer identifier for bookings (matches seeded customer references). |
| **Service Types** | `OIL_CHANGE` (30m)<br/>`TIRE_ROTATION` (30m)<br/>`BRAKE_INSPECTION` (45m)<br/>`ENGINE_DIAGNOSTIC` (60m)<br/>`BATTERY_EV_SERVICE` (90m) | Evaluates dual resources: Bay capacity + Technician skill certification (`HIGH_VOLTAGE_EV` required for EV). |
| **Reference Date** | `2026-11-04` | Standard test date (accepts any valid `YYYY-MM-DD`). |

### Core Endpoints & Example cURL

```bash
# 1. Overview of dealership available schedule
curl -s "http://127.0.0.1:3001/api/v1/availabilities?dealershipId=D01&includeBooked=false"

# 2. Query real-time available slots (dual-resource matching)
curl -s "http://127.0.0.1:3001/api/v1/availability?dealershipId=D01&serviceType=OIL_CHANGE&date=2026-11-04"

# 3. Retrieve confirmed appointments by Vehicle ID / VIN
curl -s "http://127.0.0.1:3001/api/v1/vehicles/1HGCR2F83HA000000/appointments"

# 4. Atomically book an appointment
curl -s -X POST "http://127.0.0.1:3001/api/v1/appointments/book" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST-01",
    "dealershipId": "D01",
    "vehicleVin": "1HGCR2F83HA000000",
    "serviceType": "OIL_CHANGE",
    "requestedStartTime": "2026-11-04T09:00:00.000Z"
  }'

# 5. Liveness and database connectivity health probe
curl -s "http://127.0.0.1:3001/health"
```

---

## 3. AI Collaboration Narrative

> *This section fulfills the Keyloop Technical Assessment requirement for an AI Collaboration Narrative.*

### 3.1. High-Level Guiding Strategy
Rather than relying on open-ended AI prompting, we enforced a **Spec-Driven Development (SDD)** workflow:
- **Triad Architecture:** Human Lead Architect partnered with **2 independent Frontier Models** to cross-examine architectural designs, relation schemas, and concurrency boundaries before touching implementation code.
- **Mechanical Flash Runner:** A fast Flash model generated boilerplate code and unit test suites constrained strictly by file-level invariants in `AGENTS.md`.
- **Vertical Slice Co-location:** All scheduling code is co-located in `src/features/scheduling/` across 4 distinct roles (`contract`, `rules`, `storage`, `router`), keeping every file $\le 150$ lines with zero `else`.

### 3.2. Verification & Refinement Process
We applied **Active Human Skepticism** to correct AI architectural blind spots:
- **Vetoed Horizontal Layers:** Rejected the AI's proposal to split code into conventional horizontal layers (`controllers/`, `services/`, `models/`), enforcing modular Vertical Slices.
- **Enforced Concurrency Locking:** Replaced naive application-level checks with PostgreSQL transaction-scoped advisory locks (`pg_advisory_xact_lock`) combined with row-level locks (`SELECT ... FOR UPDATE`) in `DrizzleSchedulingStorage.saveAppointmentAtomic` to serialize competing writers and eliminate double-booking race conditions.
- **Fixed Degraded Stubs:** Detected and eradicated mock placeholder responses on `/api/v1/availabilities`, wiring it directly into the real availability engine.
- **Client Recognition & Flexible Vehicle Identifiers:** Relaxed rigid 17-character VIN constraints to support legacy DMS opaque identifiers, reflecting real-world automotive intake workflows (*"A good dealership remembers clients' tastes"*).

### 3.3. Ensuring Final Quality
- **BDD-TDD Invariants:** Locked dual-resource constraints, half-open interval math `max(S1, S2) < min(E1, E2)`, and EV technician skill verification in deterministic test suites.
- **Fresh Clone Standard:** Any reviewer cloning the repo can verify the entire test suite in seconds with zero setup:
  ```bash
  pnpm test  # 12 test files, 45 tests — 100% PASS
  ```
- **Read the Full Narrative:** For complete architectural logs and engineering audit trails, see [**`docs/ai-collaboration-narrative.md`**](docs/ai-collaboration-narrative.md).

---

## 🎬 4. Technical Walkthrough Video

> **Keyloop Technical Assessment Deliverable 3:** Full 5-minute video presentation covering System Design, Concurrency Defense, Live Swagger Execution, and the AI Collaboration Story.

▶️ **[Click here to watch the full 5-Minute Walkthrough Video (MP4, 1080p Full HD)](./walkthrough_video_final.mp4)**  
*(Duration: **05:10** | Format: **H.264 / AAC 1080p** | Size: **8.74 MB** | Native GitHub Browser Playback)*

### ⏱️ Video Chapter Breakdown
- **`00:00 – 00:30`** — **Intro & The Automotive Dilemma:** Dealership dual-resource dilemma (Bay + Tech).
- **`00:30 – 01:33`** — **5-Tier System Architecture:** Mathematical half-open intervals `[start, end)`, Strategy Pattern DI.
- **`01:33 – 02:27`** — **Vertical Slice Architecture:** Locality of behavior in `src/features/scheduling/` & strict `AGENTS.md` rules ($\le 150$ LOC).
- **`02:27 – 02:50`** — **Turnkey Setup & Health:** One-command Docker + 45/45 tests passing suite (100% PASS).
- **`02:50 – 03:53`** — **Live Swagger Demo:** Pre-seeded data ➔ `GET /availabilities` (200 OK) ➔ `POST /book` (201 Created atomic lock).
- **`03:53 – 04:41`** — **AI Collaboration Narrative:** Triad Workflow (Human + 2 Frontier models + Flash runner) & human skepticism.
- **`04:41 – 05:11`** — **Test Suite & Finale:** Terminal 100% PASS proof ➔ Return to GitHub repo wrap-up.
