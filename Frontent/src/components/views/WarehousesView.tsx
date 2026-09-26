import React, { useState } from 'react';
import { useStockSense } from '../../context/StockSenseContext';
import {
  Building2,
  MapPin,
  PlusCircle,
  Plus,
  X,
  Layers,
  Box,
  FolderTree,
  CheckCircle2
} from 'lucide-react';

export const WarehousesView: React.FC = () => {
  const { warehouses, locations, products, addWarehouse, addLocation } = useStockSense();

  const [isAddWHModalOpen, setIsAddWHModalOpen] = useState(false);
  const [isAddLocModalOpen, setIsAddLocModalOpen] = useState(false);

  // Warehouse Form State
  const [whForm, setWhForm] = useState({
    name: '',
    code: '',
    city: '',
    type: 'Distribution Center',
    capacity: 10000,
    address: ''
  });

  // Location Form State
  const [locForm, setLocForm] = useState({
    warehouseId: warehouses[0]?.id || 'WH-001',
    name: '',
    code: '',
    type: 'Storage' as const,
    capacity: 2500,
    aisle: 'Aisle 1',
    shelf: 'Tier 1'
  });

  const handleSaveWH = (e: React.FormEvent) => {
    e.preventDefault();
    addWarehouse(whForm);
    setIsAddWHModalOpen(false);
    setWhForm({
      name: '',
      code: '',
      city: '',
      type: 'Distribution Center',
      capacity: 10000,
      address: ''
    });
  };

  const handleSaveLoc = (e: React.FormEvent) => {
    e.preventDefault();
    addLocation(locForm);
    setIsAddLocModalOpen(false);
    setLocForm({
      warehouseId: warehouses[0]?.id || 'WH-001',
      name: '',
      code: '',
      type: 'Storage' as const,
      capacity: 2500,
      aisle: 'Aisle 1',
      shelf: 'Tier 1'
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
              Facility Infrastructure
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold">{warehouses.length} Active Facilities</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 font-display">Warehouses & Storage Locations</h1>
          <p className="text-xs text-slate-500">
            Configure multi-warehouse physical buildings, storage aisles, bins, docks and capacity meters.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddLocModalOpen(true)}
            className="btn btn-secondary text-xs"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>+ Add Location</span>
          </button>
          <button
            onClick={() => setIsAddWHModalOpen(true)}
            className="btn btn-primary text-xs"
          >
            <Building2 className="w-4 h-4" />
            <span>+ Add Warehouse</span>
          </button>
        </div>
      </div>

      {/* Warehouse Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {warehouses.map(w => {
          const whLocs = locations.filter(l => l.warehouseId === w.id);
          const whProds = products.filter(p => p.warehouseId === w.id);
          const totalStock = whProds.reduce((sum, p) => sum + p.stock, 0);
          const util = Math.min(100, Math.round((totalStock / (w.capacity || 10000)) * 100));

          return (
            <div key={w.id} className="card p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50/70 rounded-full blur-xs pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {w.code}
                  </span>
                  <span className="badge badge-active">{w.status}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-display">{w.name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{w.address}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">Manager: <strong className="text-slate-700">{w.manager}</strong></p>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Bins</span>
                    <span className="block text-sm font-bold text-slate-800">{whLocs.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Products</span>
                    <span className="block text-sm font-bold text-slate-800">{whProds.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Units</span>
                    <span className="block text-sm font-bold text-blue-600">{totalStock}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                  <span>Capacity Load</span>
                  <span>{util}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${util}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warehouse -> Location Hierarchy Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-blue-600" />
              Warehouse ➔ Storage Location Hierarchy Tree
            </h3>
            <span className="text-xs font-mono text-slate-400">Physical Layout</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {warehouses.map(w => {
              const whLocs = locations.filter(l => l.warehouseId === w.id);
              return (
                <div key={w.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between font-bold text-slate-900 mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>{w.name} [{w.code}]</span>
                      <span className="text-[11px] font-normal text-slate-500 font-sans">({w.city})</span>
                    </div>
                    <span className="text-xs font-sans text-slate-500 font-semibold">{whLocs.length} assigned bins</span>
                  </div>

                  <div className="pl-6 border-l-2 border-blue-300 space-y-2 mt-2">
                    {whLocs.length === 0 ? (
                      <div className="text-slate-400 text-xs italic font-sans">No sub-locations configured.</div>
                    ) : (
                      whLocs.map((l, idx) => (
                        <div key={l.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-white transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{idx === whLocs.length - 1 ? '└──' : '├──'}</span>
                            <span className="font-bold text-slate-800">{l.name}</span>
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded font-semibold font-mono">
                              {l.code}
                            </span>
                            <span className="text-slate-400 font-sans text-[11px]">({l.type})</span>
                          </div>
                          <div className="text-right font-sans text-xs text-slate-500">
                            Cap: <strong className="text-slate-800">{l.capacity}</strong> units
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Type Reference */}
        <div className="card p-6 space-y-5">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Location Type Overview
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <span className="font-semibold text-slate-700">Storage & Pallet Racks</span>
              </div>
              <span className="font-bold text-slate-900">4 Racks</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                <span className="font-semibold text-slate-700">Production Assembly Bins</span>
              </div>
              <span className="font-bold text-slate-900">2 Bins</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                <span className="font-semibold text-slate-700">Receiving Inbound Docks</span>
              </div>
              <span className="font-bold text-slate-900">1 Dock</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-600"></span>
                <span className="font-semibold text-slate-700">Dispatch Outbound Bays</span>
              </div>
              <span className="font-bold text-slate-900">1 Bay</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
            <strong className="font-bold text-blue-800">Warehouse Guidelines:</strong>
            <p className="text-blue-700 leading-relaxed text-[11px]">
              Every storage location is assigned a unique barcode shortcode (e.g. R-A01, PR-01) for fast barcode scanning during receiving and delivery staging.
            </p>
          </div>
        </div>
      </div>

      {/* Add Warehouse Modal */}
      {isAddWHModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Add New Facility Warehouse
              </h3>
              <button onClick={() => setIsAddWHModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWH}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="form-label">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    value={whForm.name}
                    onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                    placeholder="e.g. Surat Logistics Center"
                    className="form-control text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Short Code *</label>
                    <input
                      type="text"
                      required
                      value={whForm.code}
                      onChange={(e) => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
                      placeholder="WH-005"
                      className="form-control text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="form-label">City / Region *</label>
                    <input
                      type="text"
                      required
                      value={whForm.city}
                      onChange={(e) => setWhForm({ ...whForm, city: e.target.value })}
                      placeholder="Surat, Gujarat"
                      className="form-control text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Facility Type</label>
                    <select
                      value={whForm.type}
                      onChange={(e) => setWhForm({ ...whForm, type: e.target.value })}
                      className="form-control text-xs"
                    >
                      <option>Distribution Center</option>
                      <option>Production & Assembly</option>
                      <option>Cross-Dock Hub</option>
                      <option>Cold Storage</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Capacity (Units)</label>
                    <input
                      type="number"
                      min="500"
                      value={whForm.capacity}
                      onChange={(e) => setWhForm({ ...whForm, capacity: Number(e.target.value) })}
                      className="form-control text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Address & Landmark</label>
                  <textarea
                    rows={2}
                    value={whForm.address}
                    onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
                    placeholder="GIDC Sector, Industrial Estate..."
                    className="form-control text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsAddWHModalOpen(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {isAddLocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Add Storage Rack / Bin Location
              </h3>
              <button onClick={() => setIsAddLocModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLoc}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="form-label">Parent Warehouse *</label>
                  <select
                    value={locForm.warehouseId}
                    onChange={(e) => setLocForm({ ...locForm, warehouseId: e.target.value })}
                    className="form-control text-xs"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Location / Rack Name *</label>
                  <input
                    type="text"
                    required
                    value={locForm.name}
                    onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                    placeholder="e.g. Rack D - Fast Moving FMCG"
                    className="form-control text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Short Code *</label>
                    <input
                      type="text"
                      required
                      value={locForm.code}
                      onChange={(e) => setLocForm({ ...locForm, code: e.target.value.toUpperCase() })}
                      placeholder="R-D01"
                      className="form-control text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="form-label">Location Type</label>
                    <select
                      value={locForm.type}
                      onChange={(e) => setLocForm({ ...locForm, type: e.target.value as any })}
                      className="form-control text-xs"
                    >
                      <option value="Storage">Storage</option>
                      <option value="Production">Production</option>
                      <option value="Receiving Dock">Receiving Dock</option>
                      <option value="Dispatch Dock">Dispatch Dock</option>
                      <option value="Secure Cage">Secure Cage</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Aisle Number</label>
                    <input
                      type="text"
                      value={locForm.aisle}
                      onChange={(e) => setLocForm({ ...locForm, aisle: e.target.value })}
                      placeholder="Aisle 4"
                      className="form-control text-xs"
                    />
                  </div>
                  <div>
                    <label className="form-label">Capacity (Units)</label>
                    <input
                      type="number"
                      min="100"
                      value={locForm.capacity}
                      onChange={(e) => setLocForm({ ...locForm, capacity: Number(e.target.value) })}
                      className="form-control text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsAddLocModalOpen(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
