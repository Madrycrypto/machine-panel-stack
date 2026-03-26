# Road Map: From MVP to Enterprise SaaS (Production OS)

This document outlines the strategic and technical phases required to transform the current Single-Tenant MVP (Machine Panel Stack) into a professional, scalable, multi-tenant B2B SaaS platform for the manufacturing industry (PropTech / Industry 4.0).

---

## Phase 1: Architectural Foundation (Re-platforming)
To support multiple companies (tenants) securely and efficiently, the underlying architecture needs to be upgraded from a local, single-instance setup to a robust cloud infrastructure.

*   **1.1. Database Migration (PostgreSQL):** 
    *   Transition from `SQLite` to a scalable relational database like `PostgreSQL`.
    *   Implement Database Migrations (e.g., using `Alembic` for SQLAlchemy).
*   **1.2. Multi-Tenancy Architecture:**
    *   Introduce the concept of `Organization` or `Tenant`.
    *   Modify all database models to include a `tenant_id` foreign key to ensure absolute data isolation (Company A cannot see Company B's downtime data).
*   **1.3. Robust Authentication & Authorization (SSO/JWT):**
    *   Replace hardcoded passwords with a robust `OAuth2` / `JWT (JSON Web Token)` system.
    *   Implement Role-Based Access Control (RBAC): `SuperAdmin` (Us), `CompanyAdmin` (Plant Manager), `ShiftMaster` (Mistrz Zmiany), `Operator`.
    *   Prepare for Enterprise SSO integration (Microsoft Entra ID / Google Workspace).
*   **1.4. Security Auditing:**
    *   Enforce `HTTPS/TLS` for all endpoints.
    *   Implement rate-limiting and robust input validation to prevent SQL Injection and XSS attacks.

---

## Phase 2: Cloud Infrastructure & DevOps
Automating deployments and ensuring high availability on cloud servers.

*   **2.1. Containerization (Docker):**
    *   Create `Dockerfile`s for the FastAPI backend and any modern frontend application (e.g., Next.js).
    *   Use `docker-compose` for local orchestration and staging environments.
*   **2.2. CI/CD Pipelines (GitHub Actions):**
    *   Automate testing (pytest) on every commit.
    *   Automate the build and deployment process so that a `git push origin main` triggers a seamless update across all client servers without downtime (Zero-Downtime Deployment).
*   **2.3. Real-Time Communication Upgrade (WebSockets/Redis):**
    *   Replace the current 5-second HTTP polling mechanism in the Master Dashboard with WebSockets (powered by a Redis Pub/Sub backend) for instant, resource-efficient, real-time updates to hundreds of screens simultaneously.
*   **2.4. Cloud Hosting Provisioning:**
    *   Deploy the initial MVP SaaS environment on optimized cloud infrastructure (e.g., Hostinger KVM 4/8, DigitalOcean, or AWS EC2).

---

## Phase 3: The "Production OS" Ecosystem Modules
Expanding the software beyond just issue reporting to solve core manufacturing bottlenecks, leveraging 20 years of Lean/Sigma experience.

*   **3.1. Advanced Issue Reporting (Core):**
    *   Configurable integrations per tenant (Clients can paste their own Lark/Slack/Teams webhook URLs in their settings).
    *   Customizable failure codes (each tenant defines their own `failures.json` visually via their Admin Dashboard).
*   **3.2. Digital Checklists (TPM/5S Module):**
    *   Allow creation of dynamic, daily shift-start checklists for operators.
    *   Automatically trigger maintenance requests if a checklist item fails.
*   **3.3. Layered Process Audits (LPA Module):**
    *   Mobile-first (PWA) forms for management "Gemba Walks".
    *   Randomized question generation per machine/process.
    *   Photo attachments and automatic Corrective Action assignments.
*   **3.4. Interactive SOPs (Standard Operating Procedures):**
    *   Digital document repository tied to machine IDs or Part Numbers for instant cross-training and fast changeovers (SMED).
*   **3.5. Integrated Quality Management & Problem Solving (QMS/APQP Module):**
    *   **The "Golden Thread":** Tightly interlink Process Maps, FMEA, and Control Plans. A change or new failure mode in one automatically flags the others for review.
    *   **QRQC & 8D/3D Reporting:** Structured tools for fast response (QRQC) and deep problem solving (8D/3D).
    *   **FMEA Feedback Loop:** When creating an 8D or 3D, the system automatically checks if the root cause or defect was already identified in the PFMEA. If not, it enforces a PFMEA revision.
    *   **5-Why & Root Cause Analysis:** Interactive 5-Why tools, potentially assisted by AI to cluster historical data and suggest root causes for quality engineers.

---

## Phase 4: Business Administration & Billing
Creating the tools necessary to manage the SaaS business itself.

*   **4.1. Super-Admin Dashboard:**
    *   A hidden portal to manage our clients: activate/deactivate companies, monitor their usage, and view active connected devices (tablets).
*   **4.2. Billing & Subscription Management:**
    *   Integrate a payment gateway (e.g., Stripe) for automated Monthly Recurring Revenue (MRR) collection based on the pricing model (e.g., Per-Seat / Per-Machine).
*   **4.3. Onboarding Wizard:**
    *   Self-serve onboarding flow allowing a new Plant Manager to sign up, configure their shift schedules, add their machines, and deploy the PWA to their shop floor tablets without requiring our manual database intervention.

---

## Summary of the Go-To-Market Strategy
1.  **Dogfooding (Current Phase):** Thoroughly test the system on our own production floor. Gather hard ROI metrics (e.g., "% reduction in response time").
2.  **Productization:** Execute Phases 1 & 2 to convert the codebase into a secure B2B product.
3.  **Consultative Selling:** Approach known network contacts (Plant Managers, Quality Directors) offering a Lean/OEE audit combined with a 30-day free trial of the software.
4.  **Land & Expand:** Start with the Core module (Issue Reporting) at a low entry cost. Upsell the 5S, LPA, and AI modules as the factory's digital maturity grows.
