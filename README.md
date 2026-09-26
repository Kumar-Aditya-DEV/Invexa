# StockSense — Inventory Management System (v1 Spec & Guide)

> This document is the single source of truth for implementing **StockSense v1**. It consolidates PRD v0.10 into an actionable spec: what to build, the exact schemas and routes, the concurrency/security rules that are non-negotiable, and the acceptance tests that prove it works.

---

## 1. What You're Building

StockSense is a **single-tenant, internal Inventory Management System (IMS)** that replaces spreadsheets/paper registers with a centralized, real-time platform for tracking stock across one or more warehouses.

- **One deployment, one database, one company.** No signup, no multi-company data model, no customer-facing anything. If this is ever resold to multiple businesses, that's a separate multi-tenancy re-architecture — don't build toward it speculatively.
- **Responsive React web app**, not React Native. Barcode scanning (the one plausible driver for a native/PWA companion) is Phase 2, not v1.
- Two roles: **Inventory Manager** (full access) and **Warehouse Staff** (restricted, warehouse-scoped — see §6).

**Problems this solves:** no real-time visibility across locations, error-prone manual reconciliation, no audit trail of who moved what, and no proactive low-stock alerting.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React (web), responsive layout | Not React Native |
| Backend | Node.js + Express | REST API |
| Database | MongoDB | **Requires a replica set in every environment, including local dev** — transactions silently fail without one |
| Auth | Stateless JWT, short expiry (4–8h), no server-side revocation | No signup, no forgot-password |

Build the local dev environment (docker-compose or equivalent) around a Mongo **replica set** from day one — this is a hard requirement, not an optimization, because §11.2's transactional quant updates depend on it.

---

## 3. Data Model

### 3.1 Users
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string",
  "role": "manager | staff",
  "assignedWarehouses": ["warehouseId"],
  "mustChangePassword": "boolean",
  "active": "boolean",
  "passwordHash": "string",
  "createdAt": "date"
}
```
- `assignedWarehouses` is **never** put in the JWT (see §4) — it's read from the DB per write request.
- Disable via `active: false`; never hard-delete (preserves audit trail).

### 3.2 Products
```json
{
  "_id": "ObjectId",
  "name": "string",
  "sku": "string (unique, DB-enforced)",
  "category": "string (free text)",
  "unitOfMeasure": "string",
  "reorderPoint": "number | null",
  "active": "boolean"
}
```
- No `reorderQuantity` field — no v1 consumer (no automated reordering).
- Soft-delete only (`active: false`), never hard `DELETE`.
- **Quantities are `Decimal128` or integer base units — never JS floating-point.**

### 3.3 Warehouses & Locations
- Fixed hierarchy: **Warehouse → Rack** (not configurable in v1).
- Stock tracked per `(product, warehouse, location)`.
- Compound index on `Location`: `{ warehouseId: 1, name: 1 }`.
- Soft-delete only (`active: false`) on both `Warehouse` and `Location`. Deletion of warehouse/location blocked if non-zero stock quants exist.

### 3.4 Bootstrap Sentinel (`_meta` Collection)
```json
{
  "_id": "bootstrap",
  "used": "boolean",
  "usedAt": "Date | null"
}
```
- Atomic singleton record used for first-admin provisioning (`POST /api/setup/first-admin`).

### 3.5 Deliberately Absent Fields & Architecture (Segment A §9)
- **`reorderQuantity` on Product**: Deliberately absent; no automated reordering exists in v1 (PRD §5.2, §7, §8), so no consumer exists for this field. Only `reorderPoint` is kept for the low-stock KPI.
- **Category collection**: Deliberately absent; category is stored as a free-text field on `Product` to eliminate relational overhead in v1 (PRD §5.2, §8).
- **Configurable location depth**: Deliberately absent; fixed strictly at Warehouse → Rack. Arbitrary or recursive trees are out of scope (PRD §5.9, §8, §10).
- **`assignedWarehouses` in JWT**: Deliberately absent from token; read live from the DB on every write request so permission changes take effect immediately without token expiration delay (PRD §5.1, §5.9).
- **Self-serve signup / forgot password**: Deliberately absent; all users are created by a Manager with temporary passwords (PRD §5.1, §8).

### 3.6 Quants (Materialized Balances — Read Path)
```json
{
  "productId": "ObjectId",
  "warehouseId": "ObjectId",
  "locationId": "ObjectId",
  "quantity": "number"
}
```
- Unique index: `(productId, warehouseId, locationId)`.
- This is what the app reads for dashboards/stock lookups.
- Updated **in the same transaction** as every ledger write (§3.7, §5).

### 3.7 Stock Ledger (Source of Truth)
```json
{
  "documentId": "ObjectId",
  "type": "receipt | delivery | transfer_out | transfer_in | adjustment | reversal",
  "warehouseId": "ObjectId",
  "locationId": "ObjectId",
  "transferGroupId": "ObjectId | null",
  "reasonCode": "string | null",
  "productId": "ObjectId",
  "quantityDelta": "number",
  "balanceAfter": "number",
  "user": "userId",
  "timestamp": "UTC Date"
}
```
- **Unique index: `(documentId, type, locationId, productId)`.** `productId` must be in the index — without it, a multi-line document (e.g. a receipt with 3 products into 1 location) collides on its own second insert and rolls back the whole transaction. This applies to multi-line receipts/deliveries, multi-product transfers, and their reversals.
- **On reversal, compensating entries inherit the original `transferGroupId`** (not a new one) — a reversed transfer's 4 ledger rows (out, in, reversal-of-out, reversal-of-in) stay queryable as one logical movement.

### 3.6 Drift Alerts (from Reconciliation, §5.2)
```json
{
  "productId": "ObjectId",
  "warehouseId": "ObjectId",
  "locationId": "ObjectId",
  "ledgerDerivedBalance": "number",
  "quantsBalance": "number",
  "detectedAt": "UTC Date"
}
```

---

## 4. Authentication

- **No self-serve signup.** Users are created only by an existing Manager.
- Public auth surface is `POST /api/auth/login` only.
- **Stateless JWT**, short expiry (4–8h), no revocation blocklist in v1. Logout is client-side (discard token) only — a leaked token stays valid until it expires.
- **JWT payload: `userId` + `role` only.** `assignedWarehouses` is deliberately excluded — it's a permission *boundary*, not an identity claim. Baking it into an up-to-8h token with no revocation means a Manager revoking access wouldn't take effect until the token expires. Wrong trade-off for a security boundary.
- **Warehouse-scoping middleware reads `assignedWarehouses` from the DB on every write request**, keyed by `userId`. One indexed `users` lookup per write (cheap, negligible at this scale). Makes assignment changes effective on the Staff user's **next request**, not their next login. Manager requests skip this lookup entirely.
- **No forgot-password flow.** Removed from scope; see temp-password flow below.
- **Temp passwords force a change on first login.** Every user created via user management gets `mustChangePassword: true`. **Enforced server-side**: middleware blocks every route except `PUT /api/auth/change-password`, `GET /api/auth/me`, `POST /api/auth/logout` while the flag is set.
- **Bootstrap (first Manager account):**
  1. A one-time setup route/script that only works while the `users` collection is empty, and disables itself after the first user is created. **The "is this the first user" check must be atomic** — `findOneAndUpdate` with `upsert` against a singleton sentinel, not a naive count-then-insert (race condition otherwise).
  2. Or: manually insert the first Manager directly at deploy time.
- **Rate-limit `POST /api/auth/login`.**
- Change-password lives in the logged-in user's own `/profile` page.

---

## 5. Core Features

### 5.1 Product Management
- Create/update: name, SKU (unique, DB-enforced), category (free text), unit of measure, optional nullable `reorderPoint`.
- Stock availability shown per location.
- Soft-delete only.

### 5.2 Stock Ledger & Reconciliation
- See §3.5 for schema.
- **Reconciliation job — concretely specified:**
  - Scheduled (cron, every 15 min in production) via `npm run reconcile`, plus on-demand `POST /api/admin/reconcile` (Manager only).
  - For every `(productId, warehouseId, locationId)` tuple with ≥1 ledger entry: re-derive balance by summing `quantityDelta` and compare to the corresponding `quants` doc.
  - **On drift: do NOT auto-correct.** Auto-correcting a detected inconsistency without human review risks masking a real bug. Instead, write a `driftAlerts` record and surface a "data integrity" banner + count on the Manager dashboard. Manager resolves manually — no auto-fix action in v1.
  - This job is what §9's "zero drift" success criterion is measured against.
- `GET /api/ledger` filters: date range, product, location, document type, user.
- All timestamps UTC. `/api/ledger` and `/api/move-history` are cursor-paginated; every other list endpoint is offset-paginated.

### 5.3 Document Line-Item Schema
- **Receipts / Deliveries** (single location per document): header carries one `warehouseId`/`locationId`; lines are `{ productId, quantity }`.
- **Transfers** (two locations per document, not per line): header carries `sourceWarehouseId`, `sourceLocationId`, `destWarehouseId`, `destLocationId`; lines are `{ productId, quantity }`. Splitting different products to different destinations in one transfer is Phase 2.
- **Adjustments**: no lines array — always exactly one product/location.
- **Validation on every line-item array:**
  - `quantity <= 0` on any line → `400`
  - duplicate `productId` in the same document → `400` (reject, never silently merge)
  - `validate` called on a document with zero lines → `400`

### 5.4 Receipts (Incoming)
- Create → add supplier & products → input quantities → validate → stock increases + ledger entry.
- `supplier` is a plain free-text field (no vendor management, §8).

### 5.5 Delivery Orders (Outgoing)
- Pick → pack → validate → stock decreases + ledger entry.
- `customer` is likewise plain free text.

### 5.6 Internal Transfers
- **One-step model**: stock does not move until `Done`. `Ready` is a staging/approval label only — there is **no** "in transit" state in v1.
- Total stock unchanged overall; location updates at `Done`; logged as a linked `transfer_out`/`transfer_in` pair.
- Source and destination location must differ — `400` if the same.

### 5.7 Stock Adjustments
- Select product/location → enter counted quantity → system computes delta → updates stock → logs with reason code.
- `reasonCode` is a **fixed enum**: `damage | theft | count_error | expiry | found | other`.
- Counted quantity must be `>= 0` — `400` otherwise.

### 5.8 Multi-Warehouse & Staff Assignment
- Structure: Warehouse → Rack (v1 depth, not configurable).
- Every Staff user has `assignedWarehouses: [warehouseId]`, set by a Manager. This is what closes the RBAC scoping hole in §6 — without it, Staff would be a single flat permission level with no boundary between warehouses.
- Managers are implicitly scoped to all warehouses.
- Document-level *ownership* (who personally created a document) stays out of scope in v1 — this is warehouse-level scoping only.

### 5.9 Dashboard
- KPIs: total products in stock, low/out-of-stock items, pending receipts, pending deliveries, scheduled transfers.
- **"Total products in stock"**: count of distinct active products with quantity > 0 in at least one location.
- **"Low stock"**: a product is low-stock if its total quantity across all locations is `<= reorderPoint` when set, else `<=` the global low-stock threshold (Manager-configurable in Settings). "Out of stock" is always `quantity == 0`, independent of any threshold.
  - *Why per-product with a global fallback, not just global*: a flat global threshold makes the KPI meaningless across a product mix with different turnover (3 units of a slow mover and 50 of a fast mover can't share one number and mean anything).
- Dynamic filters: document type, status (`Draft/Waiting/Ready/Done/Canceled/Reversed`), warehouse, category.
- KPIs read from `quants`, kept consistent with the ledger via §5.2's job.

### 5.10 Move History
- Searchable/filterable view over the stock ledger (same filters as §5.2).

### 5.11 User Management (Manager only)
- View all users; add a user (name, email, role) with a temp password shown once, `mustChangePassword: true`.
- For Staff users: Manager sets `assignedWarehouses` at creation and can edit any time (multi-select of active warehouses). Not applicable to Manager accounts. Edits take effect on the affected user's **next request** (per §4), not next login.
- Disable, don't delete — preserves the ledger's audit trail.

---

## 6. RBAC Permission Matrix

| Resource / Action | Manager | Staff |
|---|---|---|
| View products | ✅ | ✅ |
| Create / edit product | ✅ | ❌ |
| Soft-delete product | ✅ | ❌ |
| View stock by product/location | ✅ | ✅ (all warehouses, read-only) |
| View warehouses/locations | ✅ | ✅ (all warehouses, read-only) |
| Create receipt/delivery/adjustment (Draft) | ✅ any warehouse | ✅ only if `document.warehouseId ∈ assignedWarehouses` |
| Create transfer (Draft) | ✅ any warehouses | ✅ only if **both** source and dest ∈ `assignedWarehouses` |
| Edit a document in its pre-Done state | ✅ any warehouse | ✅ same scoping as create |
| Edit a Done/Reversed document | ❌ (`409`) | ❌ (`409`) |
| Validate (pre-Done → Done) | ✅ any warehouse | ✅ same scoping as create |
| Cancel a pre-Done document | ✅ any warehouse | ✅ same scoping as create |
| Reverse a Done document | ✅ | ❌ |
| View ledger / move history | ✅ all | ✅ all (unscoped, see below) |
| View dashboard KPIs | ✅ all | ✅ all (unscoped, see below) |
| Manage warehouses/locations | ✅ | ❌ |
| Manage users incl. warehouse assignment | ✅ | ❌ |
| View/edit own profile, change own password | ✅ | ✅ |

**Deliberate calls — implement these exactly, don't "improve" on them:**
- Reverse is Manager-only; cancel is not — cancelling a Draft costs nothing, reversing a Done document rewrites completed history.
- `PUT` on a `Done`/`Reversed` document always `409`, any role.
- Staff can view warehouses/locations read-only and unscoped; only structural *writes* are Manager-only.
- **Write-side warehouse scoping is enforced for Staff.** For transfers, **both** source and destination must be in the Staff user's `assignedWarehouses` — checking only the source would let Staff move stock *into* a warehouse they have no business touching.
- **Read-side (ledger, move-history, dashboard KPIs) is intentionally unscoped for Staff in v1** — a deliberate simplicity trade-off to avoid building per-warehouse KPI aggregation and ledger filtering-by-permission. Revisit only if cross-warehouse visibility becomes a confidentiality concern.
- Document-level ownership remains out of scope — any Staff member assigned to a warehouse can act on any document within it, including one created by a different Staff member.

---

## 7. Phase 2 (post-MVP — do not build now)
- Barcode/QR scanning (picking, shelving, counting)
- Low-stock alerts with a defined delivery channel/recipient
- Reordering automation (auto-draft receipt or notification on crossing `reorderPoint` — v1 only *reports* low stock, takes no action)
- Reports/export (CSV/PDF)
- Document-level ownership scoping
- Stock reservation on Ready/Waiting documents
- Proper supplier/customer master data
- Category management beyond free text
- Per-line source/destination flexibility for transfers

---

## 8. Explicitly Out of Scope (v1)
Self-serve signup · forgot-password/reset flow · stock valuation (FIFO/weighted average) · batch/lot number & expiry tracking · vendor management with purchase history · multi-currency/multi-company support · configurable location depth · stock reservation · category management beyond free text · stock-in-transit modeling for transfers.

---

## 9. Success Criteria / Acceptance Tests

Build these as automated tests, not manual checks — two are explicitly called out as "write before the UI":

1. Full cycle — receive → transfer → deliver → adjust for a discrepancy — correctly reflected in both `quants` and the ledger.
2. Dashboard KPIs match ledger-derived totals with **zero drift** (verified by the reconciliation job).
3. Manager and Staff cannot access each other's restricted actions.
4. **Warehouse-scoping test**: a Staff user assigned only to Warehouse A cannot create/edit/validate/cancel a document whose warehouse (or, for transfers, source *or* destination) is outside `assignedWarehouses` → `403`. Specifically test transfers where source is assigned but destination isn't, and vice versa — the case most likely to be implemented wrong.
5. **Concurrency test (write before the UI)**: two simultaneous `validate` calls on two deliveries of the same product/location, each individually affordable but not jointly, resolve to exactly one `200` and one `409` — and `quants` ends at the correct, non-negative value. This is what proves §11.2 actually works.

---

## 10. Risks (carry these into the implementation, don't relitigate them)

| Risk | Resolution / note |
|---|---|
| MongoDB for transactional data | Resolved via §11.2 pattern below — **requires a replica set in every environment including local dev**, or transactions silently fail |
| Bootstrap admin creation | Needs an atomic first-user check (§4) |
| No password recovery | Deliberate — manual DB intervention only; acceptable for a single-tenant internal tool |
| Document-level ownership | Out of scope; any assigned Staff can act on any document in their warehouse |
| Per-write DB lookup for warehouse scoping | One indexed `users` read per write — negligible, but a deliberate departure from "everything from the JWT" |
| No stock reservation | Ready/Waiting documents don't hold stock |

---

## 11. Technical Addendum: Ledger & Concurrency

### 11.1 Idempotency on Validate
- Every `validate` checks document status inside the **same atomic operation**: only the legal pre-Done state for that type may proceed, else `409`.
- The `Done` transition, ledger entry, and quant update are written in one atomic operation.
- Backed by the unique `(documentId, type, locationId, productId)` ledger index.

### 11.2 Concurrency Strategy for Stock Quantities

**Stock-decreasing** (delivery, transfer-out, downward adjustment) — conditional atomic update, fails cleanly with `409` on insufficient stock:
```javascript
db.quants.findOneAndUpdate(
  { productId, locationId, quantity: { $gte: needed } },
  { $inc: { quantity: -needed } }
)
```

**Stock-increasing** (receipt, transfer-in, upward adjustment) — unconditional `$inc`:
```javascript
db.quants.findOneAndUpdate(
  { productId, locationId },
  { $inc: { quantity: amount } },
  { upsert: true }
)
```

Both wrapped in a transaction with the ledger insert (**requires a replica set**). No reservation layer in v1 — the stock check happens only at `validate`.

### 11.3 Negative Stock Policy
Delivery/transfer **cannot validate** on insufficient stock (`409`). Backorders are explicitly out of scope.

### 11.4 Document State Machines (differ per type — do not unify them)

| Type | Transitions |
|---|---|
| Receipt | Draft → Waiting → Done → *(Reversed)* |
| Delivery | Draft → Waiting → Ready → Done → *(Reversed)* |
| Transfer | Draft → Waiting → Ready → Done (stock moves here) → *(Reversed)* |
| Adjustment | Draft → Done → *(Reversed)* |

`Reversed` is terminal, reachable only from `Done`. Reversing an already-`Reversed` document returns `409`.

### 11.5 Cancellation vs. Reversal
- Cancelling a Draft/Waiting/Ready document: no stock has moved → status `Canceled`, no ledger entry.
- Reversing a Done document: `POST /:id/reverse` writes a reversing ledger entry (`type: reversal`), **never mutates the original**. Status → `Reversed`. Manager-only.
- `PUT` on Done/Reversed → `409` for any role.
- Adjustments: `/reverse` exists for consistency, but a new corrective adjustment is often the simpler everyday fix — both supported (UI choice, not a schema one).

---

## 12. Frontend Routes

| Route | Purpose | Access |
|---|---|---|
| `/login` | Auth | Public |
| `/dashboard` | KPIs + filters | Manager, Staff |
| `/products`, `/products/new`, `/products/:id` | Product list/create/edit | Manager (write), Staff (read) |
| `/receipts`, `/receipts/new`, `/receipts/:id` | Incoming stock | Manager, Staff |
| `/deliveries`, `/deliveries/new`, `/deliveries/:id` | Outgoing stock | Manager, Staff |
| `/transfers`, `/transfers/new`, `/transfers/:id` | Internal movement (one-step) | Manager, Staff |
| `/adjustments`, `/adjustments/new`, `/adjustments/:id` | Stock reconciliation | Manager, Staff |
| `/move-history` | Read-only ledger view | Manager, Staff |
| `/settings/warehouses` | Warehouse/rack management | Manager only |
| `/settings/users` | User management | Manager only |
| `/profile` | Profile + change-password | All |
| `*` | 404 | — |

No `/signup`, `/forgot-password`, or `/reset-password` routes.

---

## 13. API Routes

### Error Response Shape (every `400`/`409` uses this)
```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "human-readable message",
    "details": {}
  }
}
```
Representative codes —
`400`: `VALIDATION_ERROR`, `DUPLICATE_LINE_ITEM`, `EMPTY_DOCUMENT`, `SAME_SOURCE_DEST`, `INVALID_QUANTITY`
`403`: `WAREHOUSE_NOT_ASSIGNED`
`409`: `INSUFFICIENT_STOCK`, `INVALID_STATUS_TRANSITION`, `ALREADY_REVERSED`, `DOCUMENT_LOCKED`

### Pagination
- **Cursor-based** (`{ data, nextCursor, hasMore }`) for `/api/ledger` and `/api/move-history` — unbounded growth.
- **Offset-based** (`?page=&limit=`) for every other list endpoint.

### Full Route List
```text
Auth
POST   /api/auth/login             → rate-limited via express-rate-limit (10 requests per 15 minutes window, returns 429 RATE_LIMITED); rejects disabled users (active === false) with 403; issues stateless JWT containing { userId, role } only
POST   /api/auth/logout            → client-side token discard (no server blocklist); allowed mid mustChangePassword
GET    /api/auth/me                → returns current user profile; allowed mid mustChangePassword
PUT    /api/auth/change-password   → updates password and clears mustChangePassword flag

Bootstrap (atomic first-user check, PRD §5.1)
POST   /api/setup/first-admin      → atomic first-user creation using findOneAndUpdate + upsert against _meta sentinel; permanently inert (409 ALREADY_BOOTSTRAPPED) after first success

Users [Manager only]
GET    /api/users
POST   /api/users                 → body includes assignedWarehouses[] for role=staff
PUT    /api/users/:id             → includes assignedWarehouses[] updates; effective next request

Products
GET    /api/products
POST   /api/products              [Manager only]
GET    /api/products/:id
PUT    /api/products/:id          [Manager only]
DELETE /api/products/:id          [Manager only] — soft delete
GET    /api/products/:id/stock    ?warehouse=

Warehouses (GET open to any logged-in user; writes Manager-only)
GET    /api/warehouses
POST   /api/warehouses            [Manager only]
GET    /api/warehouses/:id
PATCH  /api/warehouses/:id        [Manager only]
DELETE /api/warehouses/:id        [Manager only] — soft delete; blocked if non-zero quant
GET    /api/warehouses/:id/locations
POST   /api/warehouses/:id/locations   [Manager only]
PATCH  /api/warehouses/:id/locations/:locId    [Manager only]
DELETE /api/warehouses/:id/locations/:locId    [Manager only] — blocked if non-zero quant

Receipts / Deliveries / Transfers (identical interface; state machines differ per type; line-item shape §5.3)
GET    /api/{type}
POST   /api/{type}                → validates line items per §5.3
GET    /api/{type}/:id
PUT    /api/{type}/:id            → 409 if Done or Reversed
POST   /api/{type}/:id/validate   → atomic: status check + quant update + ledger insert (§11.2)
POST   /api/{type}/:id/cancel     → pre-Done only
POST   /api/{type}/:id/reverse    → Done only; 409 if already Reversed; Manager only

Adjustments
GET    /api/adjustments
POST   /api/adjustments           → counted quantity >= 0 (400 otherwise)
GET    /api/adjustments/:id
PUT    /api/adjustments/:id       → 409 if Done or Reversed
POST   /api/adjustments/:id/validate
POST   /api/adjustments/:id/cancel     → pre-Done only
POST   /api/adjustments/:id/reverse    → Done only; Manager only

Ledger (read-only, cursor-paginated)
GET    /api/ledger    ?product= &location= &type= &user= &from= &to= &cursor=

Dashboard
GET    /api/dashboard/kpis        → reads from quants; low-stock KPI applies §5.9's threshold rule

Admin [Manager only]
POST   /api/admin/reconcile       → on-demand trigger for the scheduled reconciliation job
GET    /api/admin/drift-alerts    → unresolved drift records from the reconciliation job
```

---

## 14. Build Order (Suggested)

1. Mongo replica-set dev environment + base Express/React scaffolding.
2. Auth: bootstrap route, login, JWT issuance, `mustChangePassword` middleware.
3. Users/Products/Warehouses/Locations CRUD (Manager-only writes).
4. Ledger + quants schema, unique index, the two concurrency patterns (§11.2) — **write the concurrency acceptance test now**, before any UI.
5. Receipts/Deliveries/Transfers/Adjustments state machines + validate/cancel/reverse.
6. Warehouse-scoping middleware + the warehouse-scoping acceptance test.
7. Reconciliation job (scheduled + on-demand) and drift alerts.
8. Dashboard KPIs, move history, frontend routes/pages.
9. Full-cycle end-to-end test (§9).
