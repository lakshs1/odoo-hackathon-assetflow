# 🌌 AssetFlow

> **AssetFlow** is an enterprise-grade Asset, Resource, and Equipment Management Suite built for fast-moving teams. Inspired by the clean aesthetics of Stripe, Linear, and Apple, it integrates real-time PostgreSQL logic on Supabase with a high-fidelity Vite-React-TypeScript user interface.

---

## 🎨 Premium Visual Experience
*   **Aesthetics**: Sleek glassmorphic components, dark mode, high-contrast states, and subtle glowing borders.
*   **Micro-interactions**: Particle confetti effects on successful audits, dynamic hover animations, and sliding modal overlays.
*   **Raycast Command Palette (`⌘K` / `Ctrl+K`)**: Keyboard-navigable center to trigger modals, change system roles, query assets, and jump between views instantly.
*   **Data Visualizations**: Raw SVG elements rendering animated deployment curves, department breakdown bars, and a peak booking time heatmap.

---

## 🛠 Tech Stack
*   **Frontend**: React (v19), Vite, TypeScript, Vanilla CSS (Design System Tokens), Lucide Icons.
*   **Backend & Database**: Supabase, PostgreSQL.
*   **Database Mechanics**: Triggers, database-level validation, compound indexes, auto-incrementing serial tagging, and audit logging.

---

## 🚀 Key Features

1.  **Executive Dashboard**: Dynamic metrics monitoring utilization rates, catalog health, active repair queues, and overdue returns alongside real-time system audit logs.
2.  **Smart Asset Directory**: Complete hardware/property inventory featuring search-everywhere and dynamic **JSONB Custom Specification forms** which render custom fields based on category definitions (e.g. screen sizes for Laptops, plate numbers for Vehicles).
3.  **Deployments & Transfers**: Asset check-outs and check-ins, return condition logging, and double-allocation warnings. Supports cross-employee peer transfers requiring supervisor validation.
4.  **Booking Calendar**: Dynamic calendar grid view for shared assets (meeting rooms, vehicles) with real-time overlap validation.
5.  **Maintenance Kanban**: Drag-and-drop style columns (Pending, Approved, In Repair, Resolved) tracking tickets, technician assignments, and cost indexes.
6.  **Periodic Auditing**: Admin-managed audit scopes (by location or department), real-time checksheets for assessors, and automated catalog reconciliations.
7.  **Reports & Heatmaps**: Instant calculations of global utilization curves, department statistics, and booking densities.

---

## 📁 Database Schema Details

All table structures, triggers, and views are declared in [schema.sql](file:///Users/laksh/odoo-hackathon-assetflow/schema.sql) and implemented as a Supabase migration file.

### Core Entities:
*   `employees` & `departments`: Hierarchy, roles, and Heads of Departments (HoDs).
*   `asset_categories` & `assets`: Category definitions and physical resource items.
*   `allocations` & `transfers`: Active checkouts, history trails, and transfer requests.
*   `bookings`: Shared room/vehicle schedules.
*   `maintenance_requests`: Repairs log and assigned technician metadata.
*   `audit_cycles` & `audit_results`: Discrepancy checks and inventory cycles.
*   `activity_logs`: Chronological trail of user actions.

### Triggers & Database Protections:
1.  `generate_asset_tag_trigger`: Auto-generates clean tag strings (e.g., `AST-2026-0001`) during insert.
2.  `prevent_double_allocation_trigger`: Prevents allocating items already checked out.
3.  `validate_booking_overlap_trigger`: Rejects meeting room or vehicle bookings that overlap in timeframe.
4.  `log_asset_history_trigger`: Automates historical audit entries on status updates.

---

## ⚙️ Installation & Run Guide

### Prerequisite
Make sure you have Node.js (v18+) and npm installed.

### Step 1: Clone and Install
```bash
git clone https://github.com/lakshs1/odoo-hackathon-assetflow.git
cd odoo-hackathon-assetflow/frontend
npm install
```

### Step 2: Database Migration Setup (Optional)
If you wish to seed or push changes to Supabase:
1. Initialize/Login:
   ```bash
   npx supabase login
   ```
2. Link your project:
   ```bash
   npx supabase link --project-ref <your-project-id>
   ```
3. Push migrations to remote database:
   ```bash
   npx supabase db push
   ```

### Step 3: Run the Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔌 Linking Supabase in the Frontend UI
The application operates in **Sandbox Mode** by default with pre-filled premium assets and mock logs. 

To link your live database:
1.  Click the **Supabase Link** status button at the bottom-left of the Sidebar.
2.  Paste your **Supabase URL** and **Anon API Key** into the settings dialog.
3.  Click **Link Database**. The application will instantly switch to live querying and writing to your PostgreSQL tables!

---

## 🧪 Production Build Verification
To build the application for distribution:
```bash
npm run build
npm run preview
```
