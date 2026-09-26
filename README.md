# ⚡ Invexa

### Intelligent Inventory Operations Platform for Odoo

> **Know your stock. Understand your risk. Act before it's too late.**

Invexa is a modular, real-time **Inventory Management System (IMS)** designed to modernize warehouse and stock operations by replacing fragmented registers, spreadsheets, and manual tracking with a centralized operational platform.

Built for the **Odoo ecosystem**, Invexa connects products, warehouses, receipts, deliveries, internal transfers, adjustments, stock history, alerts, and inventory intelligence into one unified experience.

---

## 🚀 Why Invexa?

Inventory problems rarely come from a lack of data.

They come from **not having the right information at the right time.**

Businesses often deal with:

- 📊 Scattered Excel spreadsheets
- 📒 Manual inventory registers
- 🔄 Untracked internal stock movement
- ⚠️ Unexpected stockouts
- 📦 Overstocking
- 🏭 Multi-location inventory complexity
- 🧮 Physical-count discrepancies
- 🔍 Difficult stock traceability
- ⏱️ Time-consuming manual operations

### Invexa changes the workflow:

```text
                ┌─────────────────────┐
                │       Invexa        │
                │ Inventory Command   │
                │       Center        │
                └──────────┬──────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
   Products            Operations         Intelligence
       │                   │                   │
       │          ┌────────┼────────┐           │
       │          │        │        │           │
       ▼          ▼        ▼        ▼           ▼
   Catalog     Receipt  Transfer Delivery   Risk Detection
                                         
                           │
                           ▼
                    ┌──────────────┐
                    │ Stock Ledger │
                    └──────────────┘
                           │
                           ▼
                    Actionable Insight
```

---

# ✨ Core Features

## 📊 Real-Time Inventory Dashboard

A centralized command center for understanding the current state of inventory.

### Key Performance Indicators

- Total products in stock
- Low-stock products
- Out-of-stock products
- Pending receipts
- Pending deliveries
- Scheduled internal transfers
- Warehouse-level stock
- Category-level inventory

```text
┌────────────────────────────────────────────┐
│              INVEXA DASHBOARD              │
├────────────┬────────────┬──────────────────┤
│ Total Stock│ Low Stock  │ Out of Stock     │
│   12,450   │     23     │       7          │
├────────────┼────────────┼──────────────────┤
│ Receipts   │ Deliveries │ Transfers        │
│     14     │      9     │       6          │
└────────────┴────────────┴──────────────────┘
```

---

# 📦 Product Management

Create and manage products from a centralized catalog.

### Product information

- Product name
- SKU / Internal Code
- Category
- Unit of Measure
- Warehouse
- Location
- Available quantity
- Reorder level
- Stock status

### Smart product search

Search using:

```text
SKU
Product name
Category
Warehouse
Location
Stock status
```

---

# 📥 Receipts

Manage incoming inventory from suppliers.

### Workflow

```text
Create Receipt
      ↓
Select Supplier
      ↓
Add Products
      ↓
Enter Quantity
      ↓
Validate
      ↓
Stock + Quantity
      ↓
Ledger Entry
```

### Example

```text
Steel Rods

Previous Stock: 150
Received:        100
────────────────────
New Stock:       250
```

Every validated receipt automatically updates inventory.

---

# 📤 Delivery Orders

Manage outgoing inventory for customers or business operations.

### Workflow

```text
Create Delivery
      ↓
Select Products
      ↓
Pick
      ↓
Pack
      ↓
Validate
      ↓
Stock - Quantity
      ↓
Ledger Entry
```

Example:

```text
Chairs

Available: 100
Delivered:  10
────────────────
Remaining:  90
```

---

# 🔄 Internal Transfers

Move inventory between warehouses, locations, racks, or production areas.

### Examples

```text
Main Warehouse → Production Floor

Rack A → Rack B

Warehouse 1 → Warehouse 2
```

### Important principle

An internal transfer changes **location**, not total inventory.

```text
Before

Warehouse A = 100
Warehouse B = 0
Total       = 100


Transfer 40


After

Warehouse A = 60
Warehouse B = 40
Total       = 100
```

Every movement is recorded in the stock ledger.

---

# 🧮 Inventory Adjustments

Reconcile system stock with physical stock.

### Example

```text
System Quantity:   100
Physical Count:     97
Difference:         -3
```

Invexa creates an adjustment:

```text
Stock = Stock - 3
```

and records the operation for traceability.

---

# 📜 Unified Stock Ledger

Every stock movement is traceable.

| Time | Product | From | To | Qty | Operation |
|---|---|---|---|---:|---|
| 09:20 | Steel Rod | Supplier | WH-A | +100 | Receipt |
| 10:15 | Steel Rod | WH-A | Rack-B | 50 | Transfer |
| 14:10 | Steel Rod | Rack-B | Customer | -20 | Delivery |
| 16:30 | Steel Rod | Rack-B | Damage | -3 | Adjustment |

### Inventory calculation

```text
Opening Stock
     +
Receipts
     +
Transfers In
     -
Deliveries
     -
Transfers Out
     ±
Adjustments
     =
Current Stock
```

This creates a transparent operational history for every inventory movement.

---

# 🚨 Stock Intelligence

Invexa goes beyond displaying inventory numbers.

It converts inventory data into **actionable information**.

### Example

```text
╔══════════════════════════════════════╗
║          ⚠ STOCK RISK                ║
╠══════════════════════════════════════╣
║ Product: Steel Rod                   ║
║                                      ║
║ Current Stock:       27               ║
║ Reorder Level:       30               ║
║ Avg. Daily Usage:     8               ║
║                                      ║
║ Projected Stockout: ~3 days          ║
║                                      ║
║ Recommended Action:                  ║
║ Replenish 50 units                   ║
╚══════════════════════════════════════╝
```

---

# 🧠 Action Center

The Invexa Action Center turns inventory signals into operational tasks.

```text
🔴 Critical Actions

1. Steel Rod
   Stockout risk in ~3 days
   → Replenish

2. Copper Wire
   Below reorder level
   → Create replenishment

3. Warehouse B
   3 pending receipts
   → Process

4. Rack C
   Inventory discrepancy detected
   → Count stock
```

### Philosophy

> **Don't just show what happened. Tell the user what needs attention.**

---

# 🔔 Smart Alerts

Invexa monitors inventory conditions and surfaces important events.

### Alert types

- 🔴 Out of stock
- 🟠 Low stock
- 🟡 Reorder required
- 🔵 Pending operation
- ⚠️ Inventory discrepancy
- 📦 Delayed receipt
- 🚚 Pending delivery

---

# 🏭 Multi-Warehouse Support

Track stock across multiple warehouses and locations.

```text
                 INVEXA
                    │
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
  Warehouse A  Warehouse B  Warehouse C
       │            │            │
    Rack A        Rack B       Rack C
       │            │            │
   Products     Products      Products
```

Users can view:

- Warehouse stock
- Location stock
- Product availability
- Transfer history
- Inventory movements

---

# 🔎 Smart Filters

Quickly find the exact inventory operation you need.

### Filter by

**Document Type**

- Receipts
- Deliveries
- Internal Transfers
- Adjustments

**Status**

- Draft
- Waiting
- Ready
- Done
- Cancelled

**Warehouse**

- Warehouse A
- Warehouse B
- Warehouse C

**Category**

- Raw Materials
- Finished Goods
- Components
- Consumables

---

# 🔐 Authentication & Access Control

Invexa provides secure user access with role-based permissions.

### Authentication

- User registration
- Login
- OTP-based password reset
- Session management
- Profile management
- Logout

### Roles

```text
Admin
  │
  ├── Full Access
  │
Inventory Manager
  │
  ├── Products
  ├── Operations
  ├── Reports
  └── Adjustments
  │
Warehouse Staff
  │
  ├── Receiving
  ├── Picking
  ├── Transfers
  └── Counting
```

---

# 📱 Barcode-Ready Architecture

Invexa is designed to support barcode-driven warehouse workflows.

```text
Scan SKU
   ↓
Identify Product
   ↓
Get Location
   ↓
Check Availability
   ↓
Perform Operation
   ↓
Update Stock
   ↓
Create Ledger Entry
```

This creates a foundation for fast warehouse operations.

---

# 🧩 Modular Architecture

Invexa is designed around independent modules.

```text
Invexa
│
├── Authentication
│
├── Dashboard
│
├── Products
│
├── Categories
│
├── Warehouses
│
├── Receipts
│
├── Deliveries
│
├── Internal Transfers
│
├── Adjustments
│
├── Stock Ledger
│
├── Alerts
│
├── Action Center
│
└── Intelligence
```

New modules can be added without rewriting the entire system.

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      Invexa UI      │
                    │     Odoo / OWL      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Invexa Modules    │
                    ├─────────────────────┤
                    │ Products            │
                    │ Operations          │
                    │ Warehouses           │
                    │ Ledger              │
                    │ Intelligence        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Odoo ORM       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    PostgreSQL DB    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Intelligence Engine │
                    ├─────────────────────┤
                    │ Rules               │
                    │ Risk Detection      │
                    │ Reorder Logic       │
                    │ AI Insights         │
                    └─────────────────────┘
```

---

# 🛠️ Technology Stack

## Core

| Technology | Purpose |
|---|---|
| **Odoo** | ERP & business platform |
| **Python** | Backend & business logic |
| **OWL** | Modern Odoo frontend |
| **PostgreSQL** | Database |
| **Odoo ORM** | Data access |
| **XML** | Views & configuration |
| **JavaScript** | Interactive UI |
| **Docker** | Environment & deployment |

### Optional Intelligence Layer

```text
Python
   +
Rule Engine
   +
LLM / AI API
   ↓
Inventory Intelligence
```

---

# 📁 Project Structure

```text
Invexa/
│
├── Frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
│
└── README.md
