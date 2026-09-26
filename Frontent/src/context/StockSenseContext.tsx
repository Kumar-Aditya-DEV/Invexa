import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Warehouse,
  StorageLocation,
  Category,
  Receipt,
  DeliveryOrder,
  InternalTransfer,
  InventoryAdjustment,
  LedgerEntry,
  MoveHistoryEntry,
  ReorderRule,
  NotificationItem,
  UserProfile,
  DashboardKPIs
} from '../types';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

interface StockSenseContextType {
  products: Product[];
  warehouses: Warehouse[];
  locations: StorageLocation[];
  categories: Category[];
  receipts: Receipt[];
  deliveries: DeliveryOrder[];
  transfers: InternalTransfer[];
  adjustments: InventoryAdjustment[];
  ledger: LedgerEntry[];
  moveHistory: MoveHistoryEntry[];
  reorderingRules: ReorderRule[];
  notifications: NotificationItem[];
  currentUser: UserProfile;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedReceiptId: string | null;
  setSelectedReceiptId: (id: string | null) => void;
  selectedDeliveryId: string | null;
  setSelectedDeliveryId: (id: string | null) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  toasts: Toast[];
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
  removeToast: (id: string) => void;
  getKPIs: () => DashboardKPIs;

  // Actions
  addProduct: (data: Partial<Product>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  createReceipt: (data: Partial<Receipt>) => Receipt;
  validateReceipt: (id: string) => void;
  updateReceiptStatus: (id: string, status: Receipt['status']) => void;

  createDelivery: (data: Partial<DeliveryOrder>) => DeliveryOrder;
  validateDelivery: (id: string) => void;
  updateDeliveryStatus: (id: string, status: DeliveryOrder['status']) => void;

  createTransfer: (data: {
    productId: string;
    fromWarehouseId: string;
    fromLocationId: string;
    toWarehouseId: string;
    toLocationId: string;
    quantity: number;
    reason: string;
  }) => void;

  createAdjustment: (data: {
    productId: string;
    physicalCount: number;
    reason: string;
  }) => void;

  addWarehouse: (data: Partial<Warehouse>) => void;
  updateWarehouse: (id: string, updates: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  addLocation: (data: Partial<StorageLocation>) => void;
  updateLocation: (id: string, updates: Partial<StorageLocation>) => void;
  deleteLocation: (id: string) => void;
  addCategory: (data: Partial<Category>) => void;
  addReorderRule: (data: Partial<ReorderRule>) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  deleteMultipleNotifications: (ids: string[]) => void;
  clearAllNotifications: () => void;
  toggleSaveNotification: (id: string) => void;
  login: (loginId: string, role?: string) => void;
  registerUser: (data: { fullName: string; loginId: string; email: string }) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  resetAllData: () => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'USR-001',
  loginId: 'alex.rivera',
  fullName: 'Alex Rivera',
  email: 'alex.rivera@stocksense.io',
  role: 'Inventory Manager',
  warehouse: 'Main Distribution Warehouse (WH-001)',
  phone: '+91 98765 43210',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  department: 'Supply Chain Operations',
  joinedDate: 'March 2024'
};

const INITIAL_DATA = {
  warehouses: [
    { id: 'WH-001', code: 'WH-001', name: 'Main Distribution Warehouse', shortName: 'Main Warehouse', city: 'Gandhinagar', address: 'Plot 42, GIDC Industrial Estate, Sector 26, Gandhinagar, Gujarat', type: 'Central Hub', capacity: 15000, manager: 'Alex Rivera', status: 'Active' as const },
    { id: 'WH-002', code: 'WH-002', name: 'Kalol Production Warehouse', shortName: 'Production Warehouse', city: 'Kalol', address: 'Highway Bypass Rd, Kalol Industrial Zone, Gujarat', type: 'Production & Assembly', capacity: 8500, manager: 'Priya Sharma', status: 'Active' as const },
    { id: 'WH-003', code: 'WH-003', name: 'Express Transit Hub', shortName: 'Transit Hub', city: 'Ahmedabad', address: 'Cargo Terminal 2, Sarkhej-Bavla Road, Ahmedabad', type: 'Cross-Dock', capacity: 5000, manager: 'Devendra Patel', status: 'Active' as const },
    { id: 'WH-004', code: 'WH-004', name: 'Central Staging Facility', shortName: 'Staging Facility', city: 'Vadodara', address: 'Makarpura GIDC, Vadodara, Gujarat', type: 'Cold & Secure Storage', capacity: 4200, manager: 'Vikram Mehta', status: 'Active' as const }
  ],
  locations: [
    { id: 'LOC-001', code: 'R-A01', name: 'Rack A - Heavy Metals & Raw', warehouseId: 'WH-001', warehouseName: 'Main Warehouse', type: 'Storage' as const, capacity: 5000, occupied: 3200, aisle: 'Aisle 1', shelf: 'Tier 1-4' },
    { id: 'LOC-002', code: 'R-B01', name: 'Rack B - Finished Furniture', warehouseId: 'WH-001', warehouseName: 'Main Warehouse', type: 'Storage' as const, capacity: 3500, occupied: 1800, aisle: 'Aisle 2', shelf: 'Tier 1-3' },
    { id: 'LOC-003', code: 'R-C01', name: 'Rack C - Electronics & IT', warehouseId: 'WH-001', warehouseName: 'Main Warehouse', type: 'Secure Cage' as const, capacity: 2000, occupied: 450, aisle: 'Aisle 3', shelf: 'Locked Bay' },
    { id: 'LOC-004', code: 'DK-01', name: 'Inbound Dock 1', warehouseId: 'WH-001', warehouseName: 'Main Warehouse', type: 'Receiving Dock' as const, capacity: 1500, occupied: 620, aisle: 'Gate North', shelf: 'Staging Floor' },
    { id: 'LOC-005', code: 'DK-OUT', name: 'Outbound Staging Bay 3', warehouseId: 'WH-001', warehouseName: 'Main Warehouse', type: 'Dispatch Dock' as const, capacity: 1200, occupied: 410, aisle: 'Gate South', shelf: 'Pallet Line' },
    { id: 'LOC-006', code: 'PR-01', name: 'Production Rack - Assembly Line 1', warehouseId: 'WH-002', warehouseName: 'Production Warehouse', type: 'Production' as const, capacity: 4000, occupied: 2900, aisle: 'Shop Floor A', shelf: 'Bin P1-P8' },
    { id: 'LOC-007', code: 'PR-02', name: 'Raw Material Feed Bay', warehouseId: 'WH-002', warehouseName: 'Production Warehouse', type: 'Production' as const, capacity: 2500, occupied: 1100, aisle: 'Shop Floor B', shelf: 'Feed Row 2' },
    { id: 'LOC-008', code: 'TH-01', name: 'Transit Staging Bay Alpha', warehouseId: 'WH-003', warehouseName: 'Transit Hub', type: 'Cross-Dock' as const, capacity: 3000, occupied: 950, aisle: 'Zone 1', shelf: 'Floor Bay' }
  ],
  categories: [
    { id: 'CAT-001', name: 'Raw Materials', code: 'RAW', description: 'Metals, plastics, raw stock and primary components', color: '#2563EB', icon: 'Cpu', productCount: 4 },
    { id: 'CAT-002', name: 'Furniture', code: 'FURN', description: 'Ergonomic seating, desks, storage units and fixtures', color: '#0EA5E9', icon: 'Armchair', productCount: 3 },
    { id: 'CAT-003', name: 'Electronics', code: 'ELEC', description: 'Laptops, server gear, circuits and sensory units', color: '#8B5CF6', icon: 'Laptop', productCount: 3 },
    { id: 'CAT-004', name: 'Finished Goods', code: 'FG', description: 'Packaged ready-for-sale enterprise products', color: '#16A34A', icon: 'Package', productCount: 2 },
    { id: 'CAT-005', name: 'Packaging', code: 'PKG', description: 'Corrugated cartons, bubble rolls and sealing tapes', color: '#F59E0B', icon: 'Boxes', productCount: 2 },
    { id: 'CAT-006', name: 'Office Supplies', code: 'OFF', description: 'Stationery, printer consumables and accessories', color: '#64748B', icon: 'Printer', productCount: 1 }
  ],
  products: [
    {
      id: 'PROD-001',
      name: 'Steel Rods (12mm High-Grade)',
      sku: 'STL-001',
      category: 'Raw Materials',
      categoryId: 'CAT-001',
      unit: 'kg',
      costPrice: 85.00,
      sellingPrice: 120.00,
      stock: 250,
      reserved: 20,
      available: 230,
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-001',
      locationName: 'Rack A - Heavy Metals & Raw',
      reorderLevel: 50,
      maxStock: 500,
      reorderQty: 100,
      description: 'Industrial grade structural high-tensile steel reinforcement rods for manufacturing and heavy construction.',
      status: 'In Stock' as const
    },
    {
      id: 'PROD-002',
      name: 'Ergonomic Executive Office Chair',
      sku: 'FURN-CHR-002',
      category: 'Furniture',
      categoryId: 'CAT-002',
      unit: 'units',
      costPrice: 4200.00,
      sellingPrice: 7500.00,
      stock: 12,
      reserved: 2,
      available: 10,
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-002',
      locationName: 'Rack B - Finished Furniture',
      reorderLevel: 20,
      maxStock: 100,
      reorderQty: 30,
      description: 'High-back mesh ergonomic executive chair with 4D lumbar support and synchro-tilt mechanism.',
      status: 'Low Stock' as const
    },
    {
      id: 'PROD-003',
      name: 'StockSense Enterprise Core i7 Laptop',
      sku: 'ELEC-LPT-003',
      category: 'Electronics',
      categoryId: 'CAT-003',
      unit: 'units',
      costPrice: 58000.00,
      sellingPrice: 79999.00,
      stock: 0,
      reserved: 0,
      available: 0,
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-003',
      locationName: 'Rack C - Electronics & IT',
      reorderLevel: 5,
      maxStock: 50,
      reorderQty: 15,
      description: '14-inch FHD ruggedized enterprise field workstation laptops with Intel Core i7 & 32GB RAM.',
      status: 'Out of Stock' as const
    },
    {
      id: 'PROD-004',
      name: 'Industrial Work Desk [DESK001]',
      sku: 'DESK-001',
      category: 'Furniture',
      categoryId: 'CAT-002',
      unit: 'units',
      costPrice: 3000.00,
      sellingPrice: 5200.00,
      stock: 50,
      reserved: 5,
      available: 45,
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-002',
      locationName: 'Rack B - Finished Furniture',
      reorderLevel: 15,
      maxStock: 150,
      reorderQty: 40,
      description: 'Heavy duty powder-coated steel frame modular assembly work desks with cable raceways.',
      status: 'In Stock' as const
    },
    {
      id: 'PROD-005',
      name: 'Aluminum Extrusion Profile 4040',
      sku: 'ALU-EXT-005',
      category: 'Raw Materials',
      categoryId: 'CAT-001',
      unit: 'meters',
      costPrice: 240.00,
      sellingPrice: 380.00,
      stock: 480,
      reserved: 40,
      available: 440,
      warehouseId: 'WH-002',
      warehouseName: 'Production Warehouse',
      locationId: 'LOC-006',
      locationName: 'Production Rack - Assembly Line 1',
      reorderLevel: 100,
      maxStock: 1000,
      reorderQty: 250,
      description: 'Anodized 40x40 T-slot aluminum structural extrusions for automation jigs and framing.',
      status: 'In Stock' as const
    },
    {
      id: 'PROD-006',
      name: 'Hydraulic Solenoid Valve 24V DC',
      sku: 'VALV-HYD-006',
      category: 'Raw Materials',
      categoryId: 'CAT-001',
      unit: 'units',
      costPrice: 1850.00,
      sellingPrice: 2900.00,
      stock: 18,
      reserved: 3,
      available: 15,
      warehouseId: 'WH-002',
      warehouseName: 'Production Warehouse',
      locationId: 'LOC-006',
      locationName: 'Production Rack - Assembly Line 1',
      reorderLevel: 25,
      maxStock: 80,
      reorderQty: 30,
      description: 'Directional spool hydraulic valves rated for 315 bar max operating fluid pressure.',
      status: 'Low Stock' as const
    },
    {
      id: 'PROD-007',
      name: 'Heavy Duty 5-Ply Corrugated Master Cartons',
      sku: 'PKG-BOX-007',
      category: 'Packaging',
      categoryId: 'CAT-005',
      unit: 'pcs',
      costPrice: 35.00,
      sellingPrice: 55.00,
      stock: 1250,
      reserved: 100,
      available: 1150,
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-001',
      locationName: 'Rack A - Heavy Metals & Raw',
      reorderLevel: 300,
      maxStock: 3000,
      reorderQty: 800,
      description: 'Export-grade double wall corrugated dispatch packaging boxes (600x400x400mm).',
      status: 'In Stock' as const
    },
    {
      id: 'PROD-008',
      name: 'Industrial Barcode / RFID Handheld Scanner',
      sku: 'ELEC-SCN-008',
      category: 'Electronics',
      categoryId: 'CAT-003',
      unit: 'units',
      costPrice: 14500.00,
      sellingPrice: 22000.00,
      stock: 28,
      reserved: 4,
      available: 24,
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-003',
      locationName: 'Rack C - Electronics & IT',
      reorderLevel: 8,
      maxStock: 60,
      reorderQty: 20,
      description: 'Android 13 IP67 rugged mobile computer with Long-Range 2D Imager & Wi-Fi 6.',
      status: 'In Stock' as const
    }
  ],
  receipts: [
    {
      id: 'RCV-0001',
      reference: 'WH/IN/0001',
      supplier: 'Azure Interior & Metal Works',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-001',
      locationName: 'Rack A - Heavy Metals & Raw',
      scheduledDate: '2026-09-26',
      responsible: 'Alex Rivera',
      status: 'Done' as const,
      notes: 'Initial bulk supplier delivery for Q3 stock replenish.',
      items: [
        { productId: 'PROD-001', productName: 'Steel Rods (12mm High-Grade)', sku: 'STL-001', expectedQty: 50, receivedQty: 50, unit: 'kg', location: 'Rack A - Heavy Metals & Raw', unitCost: 85.00, totalCost: 4250.00 }
      ],
      createdAt: '2026-09-25T14:30:00Z',
      validatedAt: '2026-09-26T09:15:00Z'
    },
    {
      id: 'RCV-0002',
      reference: 'WH/IN/0002',
      supplier: 'Apex Heavy Metallics Ltd',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-001',
      locationName: 'Rack A - Heavy Metals & Raw',
      scheduledDate: '2026-09-26',
      responsible: 'Alex Rivera',
      status: 'Ready' as const,
      notes: 'Truck arrived at Inbound Dock 1. Verification in progress.',
      items: [
        { productId: 'PROD-001', productName: 'Steel Rods (12mm High-Grade)', sku: 'STL-001', expectedQty: 100, receivedQty: 100, unit: 'kg', location: 'Rack A - Heavy Metals & Raw', unitCost: 85.00, totalCost: 8500.00 },
        { productId: 'PROD-007', productName: 'Heavy Duty 5-Ply Corrugated Master Cartons', sku: 'PKG-BOX-007', expectedQty: 300, receivedQty: 300, unit: 'pcs', location: 'Rack A - Heavy Metals & Raw', unitCost: 35.00, totalCost: 10500.00 }
      ],
      createdAt: '2026-09-26T07:45:00Z',
      validatedAt: null
    },
    {
      id: 'RCV-0003',
      reference: 'WH/IN/0003',
      supplier: 'Matrix Ergonomics Corp',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-002',
      locationName: 'Rack B - Finished Furniture',
      scheduledDate: '2026-09-24',
      responsible: 'Priya Sharma',
      status: 'Waiting' as const,
      isLate: true,
      notes: 'Supplier transit delay reported on customs clearance.',
      items: [
        { productId: 'PROD-002', productName: 'Ergonomic Executive Office Chair', sku: 'FURN-CHR-002', expectedQty: 25, receivedQty: 0, unit: 'units', location: 'Rack B - Finished Furniture', unitCost: 4200.00, totalCost: 105000.00 }
      ],
      createdAt: '2026-09-22T10:00:00Z',
      validatedAt: null
    },
    {
      id: 'RCV-0004',
      reference: 'WH/IN/0004',
      supplier: 'Zenith Micro Electronics Co.',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-003',
      locationName: 'Rack C - Electronics & IT',
      scheduledDate: '2026-09-28',
      responsible: 'Devendra Patel',
      status: 'Draft' as const,
      notes: 'Purchase Order #PO-9821 approved. Scheduled for Monday dock arrival.',
      items: [
        { productId: 'PROD-003', productName: 'StockSense Enterprise Core i7 Laptop', sku: 'ELEC-LPT-003', expectedQty: 20, receivedQty: 0, unit: 'units', location: 'Rack C - Electronics & IT', unitCost: 58000.00, totalCost: 1160000.00 },
        { productId: 'PROD-008', productName: 'Industrial Barcode / RFID Handheld Scanner', sku: 'ELEC-SCN-008', expectedQty: 10, receivedQty: 0, unit: 'units', location: 'Rack C - Electronics & IT', unitCost: 14500.00, totalCost: 145000.00 }
      ],
      createdAt: '2026-09-26T08:30:00Z',
      validatedAt: null
    }
  ],
  deliveries: [
    {
      id: 'DEL-0001',
      reference: 'WH/OUT/0001',
      customer: 'Skyline Infrastructure Pvt Ltd',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-001',
      locationName: 'Rack A - Heavy Metals & Raw',
      scheduledDate: '2026-09-26',
      responsible: 'Alex Rivera',
      status: 'Done' as const,
      notes: 'Contract Order #CO-4412 dispatched via BlueDart Express.',
      carrier: 'BlueDart Express (AWB: 882910492)',
      items: [
        { productId: 'PROD-001', productName: 'Steel Rods (12mm High-Grade)', sku: 'STL-001', requestedQty: 20, deliveredQty: 20, unit: 'kg', location: 'Rack A - Heavy Metals & Raw', availableStock: 250 }
      ],
      createdAt: '2026-09-25T11:00:00Z',
      validatedAt: '2026-09-26T09:40:00Z'
    },
    {
      id: 'DEL-0002',
      reference: 'WH/OUT/0002',
      customer: 'Global Tech Park Facility Mgmt',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-002',
      locationName: 'Rack B - Finished Furniture',
      scheduledDate: '2026-09-26',
      responsible: 'Alex Rivera',
      status: 'Ready' as const,
      notes: 'Items picked and boxed at Outbound Staging Bay 3.',
      carrier: 'StockSense Internal Logistics Truck #GJ01-8890',
      items: [
        { productId: 'PROD-004', productName: 'Industrial Work Desk [DESK001]', sku: 'DESK-001', requestedQty: 6, deliveredQty: 6, unit: 'units', location: 'Rack B - Finished Furniture', availableStock: 45 }
      ],
      createdAt: '2026-09-26T06:30:00Z',
      validatedAt: null
    },
    {
      id: 'DEL-0003',
      reference: 'WH/OUT/0003',
      customer: 'Pinnacle Labs & Co-working',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-002',
      locationName: 'Rack B - Finished Furniture',
      scheduledDate: '2026-09-25',
      responsible: 'Priya Sharma',
      status: 'Waiting' as const,
      isLate: true,
      notes: 'Waiting for replenishment of executive chairs from supplier.',
      carrier: 'Pending Courier Assignment',
      items: [
        { productId: 'PROD-002', productName: 'Ergonomic Executive Office Chair', sku: 'FURN-CHR-002', requestedQty: 15, deliveredQty: 0, unit: 'units', location: 'Rack B - Finished Furniture', availableStock: 10 }
      ],
      createdAt: '2026-09-24T16:00:00Z',
      validatedAt: null
    },
    {
      id: 'DEL-0004',
      reference: 'WH/OUT/0004',
      customer: 'Precision Automations Gujarat',
      warehouseId: 'WH-002',
      warehouseName: 'Production Warehouse',
      locationId: 'LOC-006',
      locationName: 'Production Rack - Assembly Line 1',
      scheduledDate: '2026-09-27',
      responsible: 'Devendra Patel',
      status: 'Draft' as const,
      notes: 'Standard plant fulfillment draft created from CRM.',
      carrier: 'TBD',
      items: [
        { productId: 'PROD-005', productName: 'Aluminum Extrusion Profile 4040', sku: 'ALU-EXT-005', requestedQty: 50, deliveredQty: 0, unit: 'meters', location: 'Production Rack - Assembly Line 1', availableStock: 440 }
      ],
      createdAt: '2026-09-26T09:00:00Z',
      validatedAt: null
    }
  ],
  transfers: [
    {
      id: 'TRF-0001',
      reference: 'WH/TRF/0001',
      productName: 'Steel Rods (12mm High-Grade)',
      productId: 'PROD-001',
      sku: 'STL-001',
      fromWarehouseId: 'WH-001',
      fromWarehouseName: 'Main Warehouse',
      fromLocationId: 'LOC-001',
      fromLocationName: 'Rack A - Heavy Metals & Raw',
      toWarehouseId: 'WH-002',
      toWarehouseName: 'Production Warehouse',
      toLocationId: 'LOC-006',
      toLocationName: 'Production Rack - Assembly Line 1',
      quantity: 100,
      unit: 'kg',
      reason: 'Shop floor manufacturing production allocation',
      responsible: 'Alex Rivera',
      status: 'Done' as const,
      date: '2026-09-26',
      createdAt: '2026-09-26T08:00:00Z'
    },
    {
      id: 'TRF-0002',
      reference: 'WH/TRF/0002',
      productName: 'Heavy Duty 5-Ply Corrugated Master Cartons',
      productId: 'PROD-007',
      sku: 'PKG-BOX-007',
      fromWarehouseId: 'WH-001',
      fromWarehouseName: 'Main Warehouse',
      fromLocationId: 'LOC-001',
      fromLocationName: 'Rack A - Heavy Metals & Raw',
      toWarehouseId: 'WH-003',
      toWarehouseName: 'Transit Hub',
      toLocationId: 'LOC-008',
      toLocationName: 'Transit Staging Bay Alpha',
      quantity: 200,
      unit: 'pcs',
      reason: 'Rebalance cross-dock shipping supplies',
      responsible: 'Devendra Patel',
      status: 'Done' as const,
      date: '2026-09-25',
      createdAt: '2026-09-25T15:20:00Z'
    }
  ],
  adjustments: [
    {
      id: 'ADJ-0001',
      reference: 'WH/ADJ/0001',
      productName: 'Steel Rods (12mm High-Grade)',
      productId: 'PROD-001',
      sku: 'STL-001',
      warehouseId: 'WH-001',
      warehouseName: 'Main Warehouse',
      locationId: 'LOC-001',
      locationName: 'Rack A - Heavy Metals & Raw',
      systemQuantity: 100,
      physicalCount: 97,
      difference: -3,
      unit: 'kg',
      reason: 'Damaged during material handler movement',
      responsible: 'Alex Rivera',
      status: 'Applied' as const,
      date: '2026-09-26',
      createdAt: '2026-09-26T08:45:00Z'
    }
  ],
  ledger: [
    { id: 'LED-001', date: '2026-09-25 14:35', reference: 'WH/IN/0001', productId: 'PROD-001', productName: 'Steel Rods', operation: 'Receipt', changeType: 'IN' as const, qtyChange: 50, unit: 'kg', prevStock: 200, newStock: 250, warehouse: 'Main Warehouse', location: 'Rack A', user: 'Alex Rivera' },
    { id: 'LED-002', date: '2026-09-26 08:05', reference: 'WH/TRF/0001', productId: 'PROD-001', productName: 'Steel Rods', operation: 'Internal Transfer', changeType: 'TRANSFER' as const, qtyChange: 0, unit: 'kg', prevStock: 250, newStock: 250, warehouse: 'Main -> Production', location: 'Rack A -> PR-01', user: 'Alex Rivera' },
    { id: 'LED-003', date: '2026-09-26 08:50', reference: 'WH/ADJ/0001', productId: 'PROD-001', productName: 'Steel Rods', operation: 'Stock Adjustment', changeType: 'OUT' as const, qtyChange: -3, unit: 'kg', prevStock: 253, newStock: 250, warehouse: 'Main Warehouse', location: 'Rack A', user: 'Alex Rivera' },
    { id: 'LED-004', date: '2026-09-26 09:42', reference: 'WH/OUT/0001', productId: 'PROD-001', productName: 'Steel Rods', operation: 'Delivery Order', changeType: 'OUT' as const, qtyChange: -20, unit: 'kg', prevStock: 270, newStock: 250, warehouse: 'Main Warehouse', location: 'Rack A', user: 'Alex Rivera' }
  ],
  moveHistory: [
    { id: 'MOV-001', date: '2026-09-26 09:42', reference: 'WH/OUT/0001', type: 'Delivery', product: 'Steel Rods (12mm High-Grade)', from: 'Main Warehouse (Rack A)', to: 'Customer (Skyline Infra)', quantity: '20 kg', direction: 'OUT' as const, user: 'Alex Rivera', status: 'Done' },
    { id: 'MOV-002', date: '2026-09-26 08:50', reference: 'WH/ADJ/0001', type: 'Adjustment', product: 'Steel Rods (12mm High-Grade)', from: 'Main Warehouse (Rack A)', to: 'Scrap / Damaged Loss', quantity: '-3 kg', direction: 'OUT' as const, user: 'Alex Rivera', status: 'Done' },
    { id: 'MOV-003', date: '2026-09-26 08:05', reference: 'WH/TRF/0001', type: 'Internal Transfer', product: 'Steel Rods (12mm High-Grade)', from: 'Main Warehouse (Rack A)', to: 'Production WH (PR-01)', quantity: '100 kg', direction: 'TRANSFER' as const, user: 'Alex Rivera', status: 'Done' },
    { id: 'MOV-004', date: '2026-09-25 14:35', reference: 'WH/IN/0001', type: 'Receipt', product: 'Steel Rods (12mm High-Grade)', from: 'Vendor (Azure Interior)', to: 'Main Warehouse (Rack A)', quantity: '50 kg', direction: 'IN' as const, user: 'Alex Rivera', status: 'Done' },
    { id: 'MOV-005', date: '2026-09-25 15:20', reference: 'WH/TRF/0002', type: 'Internal Transfer', product: 'Heavy Duty 5-Ply Corrugated Master Cartons', from: 'Main Warehouse (Rack A)', to: 'Transit Hub (TH-01)', quantity: '200 pcs', direction: 'TRANSFER' as const, user: 'Devendra Patel', status: 'Done' }
  ],
  reorderingRules: [
    { id: 'RR-001', productId: 'PROD-001', productName: 'Steel Rods (12mm High-Grade)', sku: 'STL-001', minStock: 50, maxStock: 500, reorderQty: 100, warehouseId: 'WH-001', warehouseName: 'Main Warehouse', unit: 'kg', status: 'Active', autoPO: true },
    { id: 'RR-002', productId: 'PROD-002', productName: 'Ergonomic Executive Office Chair', sku: 'FURN-CHR-002', minStock: 20, maxStock: 100, reorderQty: 30, warehouseId: 'WH-001', warehouseName: 'Main Warehouse', unit: 'units', status: 'Active (Triggered)', autoPO: false },
    { id: 'RR-003', productId: 'PROD-003', productName: 'StockSense Enterprise Core i7 Laptop', sku: 'ELEC-LPT-003', minStock: 5, maxStock: 50, reorderQty: 15, warehouseId: 'WH-001', warehouseName: 'Main Warehouse', unit: 'units', status: 'Active (Critical Out of Stock)', autoPO: true },
    { id: 'RR-004', productId: 'PROD-006', productName: 'Hydraulic Solenoid Valve 24V DC', sku: 'VALV-HYD-006', minStock: 25, maxStock: 80, reorderQty: 30, warehouseId: 'WH-002', warehouseName: 'Production Warehouse', unit: 'units', status: 'Active (Triggered)', autoPO: false },
    { id: 'RR-005', productId: 'PROD-007', productName: 'Heavy Duty 5-Ply Corrugated Master Cartons', sku: 'PKG-BOX-007', minStock: 300, maxStock: 3000, reorderQty: 800, warehouseId: 'WH-001', warehouseName: 'Main Warehouse', unit: 'pcs', status: 'Active', autoPO: true }
  ],
  notifications: [
    { id: 'NOTIF-001', title: 'Low Stock Alert', message: 'Ergonomic Executive Office Chair (SKU: FURN-CHR-002) is low in stock: 12 remaining (Min Reorder: 20).', type: 'warning' as const, icon: 'AlertTriangle', time: '10 min ago', read: false, link: 'products' },
    { id: 'NOTIF-002', title: 'Out of Stock Alert', message: 'StockSense Enterprise Core i7 Laptop (SKU: ELEC-LPT-003) is completely out of stock!', type: 'danger' as const, icon: 'AlertOctagon', time: '25 min ago', read: false, link: 'products' },
    { id: 'NOTIF-003', title: 'Receipt Validated', message: 'Receipt RCV-0001 (WH/IN/0001) completed. Stock increased by 50 kg.', type: 'success' as const, icon: 'CheckCircle2', time: '1 hr ago', read: false, link: 'receipts' },
    { id: 'NOTIF-004', title: 'Delivery Order Dispatched', message: 'Delivery DEL-0001 (WH/OUT/0001) validated. Dispatched 20 kg to Skyline Infrastructure.', type: 'info' as const, icon: 'Truck', time: '2 hrs ago', read: true, link: 'deliveries' },
    { id: 'NOTIF-005', title: 'Pending Approval Required', message: 'Receipt RCV-0002 (WH/IN/0002) requires validation and dock inspection.', type: 'warning' as const, icon: 'Clock', time: '3 hrs ago', read: false, link: 'receipts' }
  ]
};

const StockSenseContext = createContext<StockSenseContextType | undefined>(undefined);

const STORAGE_KEY = 'stocksense_react_state_v1';
const USER_KEY = 'stocksense_react_user_v1';

export const StockSenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_DATA;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_USER;
  });

  const [activeView, setActiveView] = useState<string>('landing');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  }, [data]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } catch (e) {}
  }, [currentUser]);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getKPIs = (): DashboardKPIs => {
    const totalProducts = data.products.length;
    const totalStock = data.products.reduce((sum: number, p: Product) => sum + (Number(p.stock) || 0), 0);
    const lowStock = data.products.filter((p: Product) => p.stock > 0 && p.stock <= p.reorderLevel).length;
    const outOfStock = data.products.filter((p: Product) => p.stock <= 0).length;
    const pendingReceipts = data.receipts.filter((r: Receipt) => r.status === 'Waiting' || r.status === 'Ready' || r.status === 'Draft').length;
    const pendingDeliveries = data.deliveries.filter((d: DeliveryOrder) => d.status === 'Waiting' || d.status === 'Ready' || d.status === 'Draft').length;
    const internalTransfers = data.transfers.length;
    const warehouses = data.warehouses.length;

    return {
      totalProducts,
      totalStock,
      lowStock,
      outOfStock,
      pendingReceipts,
      pendingDeliveries,
      internalTransfers,
      warehouses
    };
  };

  // Products
  const addProduct = (prodData: Partial<Product>): Product => {
    const newId = `PROD-${String(data.products.length + 1).padStart(3, '0')}`;
    const stock = Number(prodData.stock) || 0;
    const reorderLevel = Number(prodData.reorderLevel) || 10;
    let status: Product['status'] = 'In Stock';
    if (stock <= 0) status = 'Out of Stock';
    else if (stock <= reorderLevel) status = 'Low Stock';

    const wh = data.warehouses.find((w: Warehouse) => w.id === prodData.warehouseId) || data.warehouses[0];
    const loc = data.locations.find((l: StorageLocation) => l.id === prodData.locationId) || data.locations[0];

    const newProduct: Product = {
      id: newId,
      name: prodData.name || 'Untitled Product',
      sku: prodData.sku || `SKU-${Date.now().toString().slice(-4)}`,
      category: prodData.category || 'Raw Materials',
      categoryId: prodData.categoryId || 'CAT-001',
      unit: prodData.unit || 'units',
      costPrice: Number(prodData.costPrice) || 50,
      sellingPrice: Number(prodData.sellingPrice) || 80,
      stock,
      reserved: 0,
      available: stock,
      warehouseId: wh.id,
      warehouseName: wh.shortName || wh.name,
      locationId: loc.id,
      locationName: loc.name,
      reorderLevel,
      maxStock: Number(prodData.maxStock) || (reorderLevel * 4),
      reorderQty: Number(prodData.reorderQty) || reorderLevel,
      description: prodData.description || 'Enterprise catalog item tracked in StockSense.',
      status
    };

    setData((prev: typeof INITIAL_DATA) => {
      const updatedProds = [newProduct, ...prev.products];
      const newLedger = stock > 0 ? [{
        id: `LED-${String(prev.ledger.length + 1).padStart(3, '0')}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        reference: 'INIT-STOCK',
        productId: newProduct.id,
        productName: newProduct.name,
        operation: 'Initial Setup',
        changeType: 'IN' as const,
        qtyChange: stock,
        unit: newProduct.unit,
        prevStock: 0,
        newStock: stock,
        warehouse: newProduct.warehouseName,
        location: newProduct.locationName,
        user: currentUser.fullName
      }, ...prev.ledger] : prev.ledger;

      return {
        ...prev,
        products: updatedProds,
        ledger: newLedger
      };
    });

    showToast('Product created successfully.', 'success');
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      products: prev.products.map((p: Product) => {
        if (p.id === id) {
          const stock = updates.stock !== undefined ? Number(updates.stock) : p.stock;
          const reorderLevel = updates.reorderLevel !== undefined ? Number(updates.reorderLevel) : p.reorderLevel;
          let status = p.status;
          if (stock <= 0) status = 'Out of Stock';
          else if (stock <= reorderLevel) status = 'Low Stock';
          else status = 'In Stock';

          return { ...p, ...updates, stock, available: stock - (p.reserved || 0), status };
        }
        return p;
      })
    }));
    showToast('Product updated successfully.', 'success');
  };

  const deleteProduct = (id: string) => {
    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      products: prev.products.filter((p: Product) => p.id !== id),
      reorderingRules: prev.reorderingRules.filter((r: ReorderRule) => r.productId !== id)
    }));
    showToast('Product removed from catalog.', 'info');
  };

  // Receipts
  const createReceipt = (rcvData: Partial<Receipt>): Receipt => {
    const nextRef = `WH/IN/${String(data.receipts.length + 1).padStart(4, '0')}`;
    const wh = data.warehouses.find((w: Warehouse) => w.id === rcvData.warehouseId) || data.warehouses[0];

    const newReceipt: Receipt = {
      id: `RCV-${String(data.receipts.length + 1).padStart(4, '0')}`,
      reference: nextRef,
      supplier: rcvData.supplier || 'Vendor Supplier Ltd',
      warehouseId: wh.id,
      warehouseName: wh.shortName || wh.name,
      locationId: rcvData.locationId || 'LOC-001',
      locationName: rcvData.locationName || 'Main Inbound Dock',
      scheduledDate: rcvData.scheduledDate || new Date().toISOString().split('T')[0],
      responsible: currentUser.fullName,
      status: rcvData.status || 'Draft',
      notes: rcvData.notes || 'Inbound delivery staged from PO.',
      items: rcvData.items || [],
      createdAt: new Date().toISOString(),
      validatedAt: null
    };

    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      receipts: [newReceipt, ...prev.receipts]
    }));

    return newReceipt;
  };

  const validateReceipt = (id: string) => {
    const receipt = data.receipts.find((r: Receipt) => r.id === id || r.reference === id);
    if (!receipt || receipt.status === 'Done') return;

    const newLedgerEntries: LedgerEntry[] = [];
    const newMoveEntries: MoveHistoryEntry[] = [];

    setData((prev: typeof INITIAL_DATA) => {
      const updatedProducts = prev.products.map((prod: Product) => {
        const item = receipt.items.find(i => i.productId === prod.id || i.sku === prod.sku);
        if (item) {
          const qty = Number(item.receivedQty || item.expectedQty || 0);
          const prevStock = prod.stock;
          const newStock = prevStock + qty;

          let status = prod.status;
          if (newStock > prod.reorderLevel) status = 'In Stock';
          else if (newStock > 0) status = 'Low Stock';
          else status = 'Out of Stock';

          newLedgerEntries.push({
            id: `LED-${Date.now()}-${prod.id}`,
            date: new Date().toLocaleString(),
            reference: receipt.reference,
            productId: prod.id,
            productName: prod.name,
            operation: 'Receipt',
            changeType: 'IN',
            qtyChange: qty,
            unit: prod.unit,
            prevStock,
            newStock,
            warehouse: receipt.warehouseName,
            location: item.location || prod.locationName,
            user: currentUser.fullName
          });

          newMoveEntries.push({
            id: `MOV-${Date.now()}-${prod.id}`,
            date: new Date().toLocaleString(),
            reference: receipt.reference,
            type: 'Receipt',
            product: prod.name,
            from: `Vendor (${receipt.supplier})`,
            to: `${receipt.warehouseName} (${item.location || prod.locationName})`,
            quantity: `${qty} ${prod.unit}`,
            direction: 'IN',
            user: currentUser.fullName,
            status: 'Done'
          });

          return {
            ...prod,
            stock: newStock,
            available: newStock - (prod.reserved || 0),
            status
          };
        }
        return prod;
      });

      const updatedReceipts = prev.receipts.map((r: Receipt) => {
        if (r.id === id || r.reference === id) {
          return { ...r, status: 'Done' as const, isLate: false, validatedAt: new Date().toISOString() };
        }
        return r;
      });

      return {
        ...prev,
        products: updatedProducts,
        receipts: updatedReceipts,
        ledger: [...newLedgerEntries, ...prev.ledger],
        moveHistory: [...newMoveEntries, ...prev.moveHistory]
      };
    });

    showToast(`Receipt ${receipt.reference} validated. Stock updated.`, 'success');
  };

  const updateReceiptStatus = (id: string, status: Receipt['status']) => {
    if (status === 'Done') {
      validateReceipt(id);
      return;
    }
    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      receipts: prev.receipts.map((r: Receipt) => (r.id === id || r.reference === id) ? { ...r, status } : r)
    }));
  };

  // Deliveries
  const createDelivery = (delData: Partial<DeliveryOrder>): DeliveryOrder => {
    const nextRef = `WH/OUT/${String(data.deliveries.length + 1).padStart(4, '0')}`;
    const wh = data.warehouses.find((w: Warehouse) => w.id === delData.warehouseId) || data.warehouses[0];

    const newDelivery: DeliveryOrder = {
      id: `DEL-${String(data.deliveries.length + 1).padStart(4, '0')}`,
      reference: nextRef,
      customer: delData.customer || 'Enterprise Customer',
      warehouseId: wh.id,
      warehouseName: wh.shortName || wh.name,
      locationId: delData.locationId || 'LOC-005',
      locationName: delData.locationName || 'Outbound Staging Bay 3',
      scheduledDate: delData.scheduledDate || new Date().toISOString().split('T')[0],
      responsible: currentUser.fullName,
      status: delData.status || 'Draft',
      notes: delData.notes || 'Outbound customer sales order.',
      carrier: delData.carrier || 'Express Courier',
      items: delData.items || [],
      createdAt: new Date().toISOString(),
      validatedAt: null
    };

    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      deliveries: [newDelivery, ...prev.deliveries]
    }));

    return newDelivery;
  };

  const validateDelivery = (id: string) => {
    const delivery = data.deliveries.find((d: DeliveryOrder) => d.id === id || d.reference === id);
    if (!delivery || delivery.status === 'Done') return;

    // Check stock sufficiency
    for (const item of delivery.items) {
      const prod = data.products.find((p: Product) => p.id === item.productId || p.sku === item.sku);
      if (prod && prod.available < Number(item.requestedQty)) {
        showToast(`Insufficient stock available for ${prod.name}!`, 'danger');
        return;
      }
    }

    const newLedgerEntries: LedgerEntry[] = [];
    const newMoveEntries: MoveHistoryEntry[] = [];

    setData((prev: typeof INITIAL_DATA) => {
      const updatedProducts = prev.products.map((prod: Product) => {
        const item = delivery.items.find(i => i.productId === prod.id || i.sku === prod.sku);
        if (item) {
          const qty = Number(item.requestedQty || item.deliveredQty || 0);
          const prevStock = prod.stock;
          const newStock = Math.max(0, prevStock - qty);

          let status = prod.status;
          if (newStock <= 0) status = 'Out of Stock';
          else if (newStock <= prod.reorderLevel) status = 'Low Stock';
          else status = 'In Stock';

          newLedgerEntries.push({
            id: `LED-${Date.now()}-${prod.id}`,
            date: new Date().toLocaleString(),
            reference: delivery.reference,
            productId: prod.id,
            productName: prod.name,
            operation: 'Delivery Order',
            changeType: 'OUT',
            qtyChange: -qty,
            unit: prod.unit,
            prevStock,
            newStock,
            warehouse: delivery.warehouseName,
            location: item.location || prod.locationName,
            user: currentUser.fullName
          });

          newMoveEntries.push({
            id: `MOV-${Date.now()}-${prod.id}`,
            date: new Date().toLocaleString(),
            reference: delivery.reference,
            type: 'Delivery',
            product: prod.name,
            from: `${delivery.warehouseName} (${item.location || prod.locationName})`,
            to: `Customer (${delivery.customer})`,
            quantity: `${qty} ${prod.unit}`,
            direction: 'OUT',
            user: currentUser.fullName,
            status: 'Done'
          });

          return {
            ...prod,
            stock: newStock,
            available: Math.max(0, newStock - (prod.reserved || 0)),
            status
          };
        }
        return prod;
      });

      const updatedDeliveries = prev.deliveries.map((d: DeliveryOrder) => {
        if (d.id === id || d.reference === id) {
          return { ...d, status: 'Done' as const, isLate: false, validatedAt: new Date().toISOString() };
        }
        return d;
      });

      return {
        ...prev,
        products: updatedProducts,
        deliveries: updatedDeliveries,
        ledger: [...newLedgerEntries, ...prev.ledger],
        moveHistory: [...newMoveEntries, ...prev.moveHistory]
      };
    });

    showToast(`Delivery ${delivery.reference} confirmed & stock deducted.`, 'success');
  };

  const updateDeliveryStatus = (id: string, status: DeliveryOrder['status']) => {
    if (status === 'Done') {
      validateDelivery(id);
      return;
    }
    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      deliveries: prev.deliveries.map((d: DeliveryOrder) => (d.id === id || d.reference === id) ? { ...d, status } : d)
    }));
  };

  // Internal Transfer (Zero company stock drift)
  const createTransfer = (trfData: {
    productId: string;
    fromWarehouseId: string;
    fromLocationId: string;
    toWarehouseId: string;
    toLocationId: string;
    quantity: number;
    reason: string;
  }) => {
    const prod = data.products.find((p: Product) => p.id === trfData.productId);
    if (!prod) return;

    const fromWH = data.warehouses.find((w: Warehouse) => w.id === trfData.fromWarehouseId) || data.warehouses[0];
    const toWH = data.warehouses.find((w: Warehouse) => w.id === trfData.toWarehouseId) || data.warehouses[1];
    const fromLoc = data.locations.find((l: StorageLocation) => l.id === trfData.fromLocationId) || data.locations[0];
    const toLoc = data.locations.find((l: StorageLocation) => l.id === trfData.toLocationId) || data.locations[1];

    const ref = `WH/TRF/${String(data.transfers.length + 1).padStart(4, '0')}`;

    const newTrf: InternalTransfer = {
      id: `TRF-${String(data.transfers.length + 1).padStart(4, '0')}`,
      reference: ref,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      fromWarehouseId: fromWH.id,
      fromWarehouseName: fromWH.shortName || fromWH.name,
      fromLocationId: fromLoc.id,
      fromLocationName: fromLoc.name,
      toWarehouseId: toWH.id,
      toWarehouseName: toWH.shortName || toWH.name,
      toLocationId: toLoc.id,
      toLocationName: toLoc.name,
      quantity: trfData.quantity,
      unit: prod.unit,
      reason: trfData.reason,
      responsible: currentUser.fullName,
      status: 'Done',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    const newLedger: LedgerEntry = {
      id: `LED-${Date.now()}`,
      date: new Date().toLocaleString(),
      reference: ref,
      productId: prod.id,
      productName: prod.name,
      operation: 'Internal Transfer',
      changeType: 'TRANSFER',
      qtyChange: 0,
      unit: prod.unit,
      prevStock: prod.stock,
      newStock: prod.stock,
      warehouse: `${fromWH.shortName} ➔ ${toWH.shortName}`,
      location: `${fromLoc.code || fromLoc.name} ➔ ${toLoc.code || toLoc.name}`,
      user: currentUser.fullName
    };

    const newMove: MoveHistoryEntry = {
      id: `MOV-${Date.now()}`,
      date: new Date().toLocaleString(),
      reference: ref,
      type: 'Internal Transfer',
      product: prod.name,
      from: `${fromWH.shortName} (${fromLoc.name})`,
      to: `${toWH.shortName} (${toLoc.name})`,
      quantity: `${trfData.quantity} ${prod.unit}`,
      direction: 'TRANSFER',
      user: currentUser.fullName,
      status: 'Done'
    };

    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      transfers: [newTrf, ...prev.transfers],
      ledger: [newLedger, ...prev.ledger],
      moveHistory: [newMove, ...prev.moveHistory]
    }));

    showToast(`Internal transfer completed. Total company stock unchanged (${prod.stock} ${prod.unit}).`, 'success');
  };

  // Stock Adjustment (Physical Count vs System Qty)
  const createAdjustment = (adjData: {
    productId: string;
    physicalCount: number;
    reason: string;
  }) => {
    const prod = data.products.find((p: Product) => p.id === adjData.productId);
    if (!prod) return;

    const sysQty = prod.stock;
    const diff = adjData.physicalCount - sysQty;
    const ref = `WH/ADJ/${String(data.adjustments.length + 1).padStart(4, '0')}`;

    const newAdj: InventoryAdjustment = {
      id: `ADJ-${String(data.adjustments.length + 1).padStart(4, '0')}`,
      reference: ref,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      warehouseId: prod.warehouseId,
      warehouseName: prod.warehouseName,
      locationId: prod.locationId,
      locationName: prod.locationName,
      systemQuantity: sysQty,
      physicalCount: adjData.physicalCount,
      difference: diff,
      unit: prod.unit,
      reason: adjData.reason,
      responsible: currentUser.fullName,
      status: 'Applied',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    const newLedger: LedgerEntry = {
      id: `LED-${Date.now()}`,
      date: new Date().toLocaleString(),
      reference: ref,
      productId: prod.id,
      productName: prod.name,
      operation: 'Stock Adjustment',
      changeType: diff >= 0 ? 'IN' : 'OUT',
      qtyChange: diff,
      unit: prod.unit,
      prevStock: sysQty,
      newStock: adjData.physicalCount,
      warehouse: prod.warehouseName,
      location: prod.locationName,
      user: currentUser.fullName
    };

    const newMove: MoveHistoryEntry = {
      id: `MOV-${Date.now()}`,
      date: new Date().toLocaleString(),
      reference: ref,
      type: 'Adjustment',
      product: prod.name,
      from: diff < 0 ? `${prod.warehouseName} (${prod.locationName})` : `Correction (${adjData.reason})`,
      to: diff < 0 ? `Adjustment Loss (${adjData.reason})` : `${prod.warehouseName} (${prod.locationName})`,
      quantity: `${diff > 0 ? '+' : ''}${diff} ${prod.unit}`,
      direction: diff >= 0 ? 'IN' : 'OUT',
      user: currentUser.fullName,
      status: 'Done'
    };

    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      products: prev.products.map((p: Product) => {
        if (p.id === prod.id) {
          const newStock = adjData.physicalCount;
          let status = p.status;
          if (newStock <= 0) status = 'Out of Stock';
          else if (newStock <= p.reorderLevel) status = 'Low Stock';
          else status = 'In Stock';

          return { ...p, stock: newStock, available: Math.max(0, newStock - (p.reserved || 0)), status };
        }
        return p;
      }),
      adjustments: [newAdj, ...prev.adjustments],
      ledger: [newLedger, ...prev.ledger],
      moveHistory: [newMove, ...prev.moveHistory]
    }));

    showToast(`Inventory adjustment applied. Stock ledger updated.`, 'success');
  };

  const addWarehouse = (whData: Partial<Warehouse>) => {
    const id = `WH-${String(data.warehouses.length + 1).padStart(3, '0')}`;
    const newWH: Warehouse = {
      id,
      code: whData.code || id,
      name: whData.name || 'New Facility',
      shortName: whData.shortName || whData.name || 'Warehouse',
      city: whData.city || 'Gujarat',
      address: whData.address || 'Industrial Zone',
      type: whData.type || 'Distribution Center',
      capacity: Number(whData.capacity) || 10000,
      manager: whData.manager || currentUser.fullName,
      status: 'Active'
    };

    setData((prev: typeof INITIAL_DATA) => ({ ...prev, warehouses: [...prev.warehouses, newWH] }));
    showToast('Warehouse facility registered.', 'success');
  };

  const updateWarehouse = (id: string, updates: Partial<Warehouse>) => {
    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      warehouses: prev.warehouses.map((w: Warehouse) => (w.id === id ? { ...w, ...updates } : w))
    }));
    showToast('Warehouse facility updated successfully.', 'success');
  };

  const deleteWarehouse = (id: string) => {
    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      warehouses: prev.warehouses.filter((w: Warehouse) => w.id !== id),
      locations: prev.locations.filter((l: StorageLocation) => l.warehouseId !== id)
    }));
    showToast('Warehouse removed.', 'info');
  };

  const addLocation = (locData: Partial<StorageLocation>) => {
    const id = `LOC-${String(data.locations.length + 1).padStart(3, '0')}`;
    const wh = data.warehouses.find((w: Warehouse) => w.id === locData.warehouseId) || data.warehouses[0];
    const newLoc: StorageLocation = {
      id,
      code: locData.code || `R-${Date.now().toString().slice(-3)}`,
      name: locData.name || 'New Location',
      warehouseId: wh.id,
      warehouseName: wh.shortName || wh.name,
      type: locData.type || 'Storage',
      capacity: Number(locData.capacity) || 2000,
      occupied: 0,
      aisle: locData.aisle || 'Aisle 1',
      shelf: locData.shelf || 'Tier 1'
    };

    setData((prev: typeof INITIAL_DATA) => ({ ...prev, locations: [...prev.locations, newLoc] }));
    showToast('Storage location created.', 'success');
  };

  const updateLocation = (id: string, updates: Partial<StorageLocation>) => {
    setData((prev: typeof INITIAL_DATA) => {
      let warehouseName: string | undefined;
      if (updates.warehouseId) {
        const wh = prev.warehouses.find((w: Warehouse) => w.id === updates.warehouseId);
        if (wh) warehouseName = wh.shortName || wh.name;
      }
      return {
        ...prev,
        locations: prev.locations.map((l: StorageLocation) =>
          l.id === id ? { ...l, ...updates, ...(warehouseName ? { warehouseName } : {}) } : l
        )
      };
    });
    showToast('Storage location updated.', 'success');
  };

  const deleteLocation = (id: string) => {
    setData((prev: typeof INITIAL_DATA) => ({
      ...prev,
      locations: prev.locations.filter((l: StorageLocation) => l.id !== id)
    }));
    showToast('Storage location removed.', 'info');
  };

  const addCategory = (catData: Partial<Category>) => {
    const id = `CAT-${String(data.categories.length + 1).padStart(3, '0')}`;
    const newCat: Category = {
      id,
      name: catData.name || 'New Category',
      code: catData.code || 'CAT',
      description: catData.description || 'Category description',
      color: catData.color || '#2563EB',
      icon: catData.icon || 'Package',
      productCount: 0
    };

    setData((prev: typeof INITIAL_DATA) => ({ ...prev, categories: [...prev.categories, newCat] }));
    showToast('Category created.', 'success');
  };

  const addReorderRule = (ruleData: Partial<ReorderRule>) => {
    const id = `RR-${String(data.reorderingRules.length + 1).padStart(3, '0')}`;
    const prod = data.products.find((p: Product) => p.id === ruleData.productId);
    const wh = data.warehouses.find((w: Warehouse) => w.id === ruleData.warehouseId) || data.warehouses[0];

    const newRule: ReorderRule = {
      id,
      productId: prod ? prod.id : 'PROD-001',
      productName: prod ? prod.name : 'Product',
      sku: prod ? prod.sku : 'SKU',
      minStock: Number(ruleData.minStock) || 10,
      maxStock: Number(ruleData.maxStock) || 100,
      reorderQty: Number(ruleData.reorderQty) || 25,
      warehouseId: wh.id,
      warehouseName: wh.shortName || wh.name,
      unit: prod ? prod.unit : 'units',
      status: 'Active',
      autoPO: Boolean(ruleData.autoPO)
    };

    setData((prev: typeof INITIAL_DATA) => ({ ...prev, reorderingRules: [...prev.reorderingRules, newRule] }));
    showToast('Safety stock reorder rule saved.', 'success');
  };

  const markNotificationRead = (id: string) => {
    setData((prev: typeof INITIAL_DATA) => {
      const updated = {
        ...prev,
        notifications: prev.notifications.map((n: NotificationItem) => n.id === id ? { ...n, read: true } : n)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleNotificationRead = (id: string) => {
    setData((prev: typeof INITIAL_DATA) => {
      const updated = {
        ...prev,
        notifications: prev.notifications.map((n: NotificationItem) => n.id === id ? { ...n, read: !n.read } : n)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const markAllNotificationsRead = () => {
    setData((prev: typeof INITIAL_DATA) => {
      const updated = {
        ...prev,
        notifications: prev.notifications.map((n: NotificationItem) => ({ ...n, read: true }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast('All notifications marked as read.', 'info');
  };

  const deleteNotification = (id: string) => {
    setData((prev: typeof INITIAL_DATA) => {
      const updated = {
        ...prev,
        notifications: prev.notifications.filter((n: NotificationItem) => n.id !== id)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast('Notification deleted', 'info');
  };

  const deleteMultipleNotifications = (ids: string[]) => {
    const idSet = new Set(ids);
    setData((prev: typeof INITIAL_DATA) => {
      const updated = {
        ...prev,
        notifications: prev.notifications.filter((n: NotificationItem) => !idSet.has(n.id))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast(`${ids.length} notifications deleted`, 'info');
  };

  const clearAllNotifications = () => {
    setData((prev: typeof INITIAL_DATA) => {
      const updated = {
        ...prev,
        notifications: []
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast('All notifications cleared', 'info');
  };

  const toggleSaveNotification = (id: string) => {
    setData((prev: typeof INITIAL_DATA) => {
      let isSaved = false;
      const updated = {
        ...prev,
        notifications: prev.notifications.map((n: NotificationItem) => {
          if (n.id === id) {
            isSaved = !n.saved;
            return { ...n, saved: isSaved };
          }
          return n;
        })
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast(isSaved ? 'Saved notification to Inbox archive' : 'Removed from saved items', 'info');
      return updated;
    });
  };

  const login = (loginId: string) => {
    const user: UserProfile = {
      id: 'USR-001',
      loginId,
      fullName: loginId === 'alex.rivera' ? 'Alex Rivera' : loginId,
      email: `${loginId}@stocksense.io`,
      role: 'Inventory Manager',
      warehouse: 'Main Distribution Warehouse (WH-001)',
      phone: '+91 98765 43210',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      department: 'Supply Chain Operations',
      joinedDate: 'March 2024'
    };
    setCurrentUser(user);
    setActiveView('dashboard');
    showToast(`Signed in as ${user.fullName}`, 'success');
  };

  const registerUser = (regData: { fullName: string; loginId: string; email: string }) => {
    const user: UserProfile = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      loginId: regData.loginId,
      fullName: regData.fullName,
      email: regData.email,
      role: 'Warehouse Operator',
      warehouse: 'Main Distribution Warehouse (WH-001)',
      phone: '+91 98123 45678',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      department: 'Logistics Operations',
      joinedDate: 'September 2026'
    };
    setCurrentUser(user);
    setActiveView('dashboard');
    showToast(`Welcome to StockSense, ${user.fullName}!`, 'success');
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setCurrentUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast('User profile updated successfully!', 'success');
  };

  const logout = () => {
    setActiveView('auth');
    showToast('Signed out of session.', 'info');
  };

  const resetAllData = () => {
    setData(INITIAL_DATA);
    setCurrentUser(DEFAULT_USER);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    showToast('StockSense reset to default enterprise dataset.', 'info');
  };

  return (
    <StockSenseContext.Provider
      value={{
        products: data.products,
        warehouses: data.warehouses,
        locations: data.locations,
        categories: data.categories,
        receipts: data.receipts,
        deliveries: data.deliveries,
        transfers: data.transfers,
        adjustments: data.adjustments,
        ledger: data.ledger,
        moveHistory: data.moveHistory,
        reorderingRules: data.reorderingRules,
        notifications: data.notifications,
        currentUser,
        activeView,
        setActiveView,
        selectedProductId,
        setSelectedProductId,
        selectedReceiptId,
        setSelectedReceiptId,
        selectedDeliveryId,
        setSelectedDeliveryId,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        toasts,
        showToast,
        removeToast,
        getKPIs,
        addProduct,
        updateProduct,
        deleteProduct,
        createReceipt,
        validateReceipt,
        updateReceiptStatus,
        createDelivery,
        validateDelivery,
        updateDeliveryStatus,
        createTransfer,
        createAdjustment,
        addWarehouse,
        updateWarehouse,
        deleteWarehouse,
        addLocation,
        updateLocation,
        deleteLocation,
        addCategory,
        addReorderRule,
        markNotificationRead,
        markAllNotificationsRead,
        toggleNotificationRead,
        deleteNotification,
        deleteMultipleNotifications,
        clearAllNotifications,
        toggleSaveNotification,
        login,
        registerUser,
        updateUserProfile,
        logout,
        resetAllData
      }}
    >
      {children}
    </StockSenseContext.Provider>
  );
};

export const useStockSense = () => {
  const context = useContext(StockSenseContext);
  if (!context) throw new Error('useStockSense must be used within a StockSenseProvider');
  return context;
};
