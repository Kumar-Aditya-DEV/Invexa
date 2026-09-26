import React, { useState } from 'react';
import { useStockSense } from '../../context/StockSenseContext';
import { Warehouse, StorageLocation } from '../../types';
import {
  Building2,
  MapPin,
  PlusCircle,
  Plus,
  X,
  Layers,
  Box,
  FolderTree,
  CheckCircle2,
  Edit2,
  Trash2,
  Settings2,
  Check
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';

export const WarehousesView: React.FC = () => {
  const {
    warehouses,
    locations,
    products,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addLocation,
    updateLocation,
    deleteLocation
  } = useStockSense();

  const [isAddWHModalOpen, setIsAddWHModalOpen] = useState(false);
  const [isEditWHModalOpen, setIsEditWHModalOpen] = useState(false);
  const [isAddLocModalOpen, setIsAddLocModalOpen] = useState(false);
  const [isEditLocModalOpen, setIsEditLocModalOpen] = useState(false);

  // New Warehouse Form State
  const [whForm, setWhForm] = useState({
    name: '',
    code: '',
    city: '',
    type: 'Distribution Center',
    capacity: 10000,
    address: '',
    manager: 'Alex Rivera'
  });

  // Edit Warehouse Form State
  const [editWHForm, setEditWHForm] = useState({
    id: '',
    name: '',
    code: '',
    city: '',
    type: 'Distribution Center',
    capacity: 10000,
    address: '',
    manager: 'Alex Rivera',
    status: 'Active' as const
  });

  // New Location Form State
  const [locForm, setLocForm] = useState({
    warehouseId: warehouses[0]?.id || 'WH-001',
    name: '',
    code: '',
    type: 'Storage' as const,
    capacity: 2500,
    aisle: 'Aisle 1',
    shelf: 'Tier 1'
  });

  // Edit Location Form State
  const [editLocForm, setEditLocForm] = useState({
    id: '',
    warehouseId: warehouses[0]?.id || 'WH-001',
    name: '',
    code: '',
    type: 'Storage' as const,
    capacity: 2500,
    aisle: 'Aisle 1',
    shelf: 'Tier 1'
  });

  // Handlers for Warehouse
  const handleSaveNewWH = (e: React.FormEvent) => {
    e.preventDefault();
    addWarehouse(whForm);
    setIsAddWHModalOpen(false);
    setWhForm({
      name: '',
      code: '',
      city: '',
      type: 'Distribution Center',
      capacity: 10000,
      address: '',
      manager: 'Alex Rivera'
    });
  };

  const handleOpenEditWH = (wh: Warehouse) => {
    setEditWHForm({
      id: wh.id,
      name: wh.name,
      code: wh.code,
      city: wh.city,
      type: wh.type,
      capacity: wh.capacity,
      address: wh.address,
      manager: wh.manager,
      status: wh.status || 'Active'
    });
    setIsEditWHModalOpen(true);
  };

  const handleSaveEditWH = (e: React.FormEvent) => {
    e.preventDefault();
    updateWarehouse(editWHForm.id, editWHForm);
    setIsEditWHModalOpen(false);
  };

  const handleDeleteWH = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? All assigned rack locations will also be unlinked.`)) {
      deleteWarehouse(id);
    }
  };

  // Handlers for Location
  const handleSaveNewLoc = (e: React.FormEvent) => {
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

  const handleOpenAddLocForWH = (whId: string) => {
    setLocForm(prev => ({ ...prev, warehouseId: whId }));
    setIsAddLocModalOpen(true);
  };

  const handleOpenEditLoc = (loc: StorageLocation) => {
    setEditLocForm({
      id: loc.id,
      warehouseId: loc.warehouseId,
      name: loc.name,
      code: loc.code,
      type: loc.type,
      capacity: loc.capacity,
      aisle: loc.aisle || 'Aisle 1',
      shelf: loc.shelf || 'Tier 1'
    });
    setIsEditLocModalOpen(true);
  };

  const handleSaveEditLoc = (e: React.FormEvent) => {
    e.preventDefault();
    updateLocation(editLocForm.id, editLocForm);
    setIsEditLocModalOpen(false);
  };

  const handleDeleteLoc = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete rack location "${name}"?`)) {
      deleteLocation(id);
    }
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
            <div key={w.id} className="card p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50/70 rounded-full blur-xs pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {w.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="badge badge-active">{w.status}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditWH(w)}
                      title="Edit Warehouse Details"
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWH(w.id, w.name)}
                      title="Delete Warehouse"
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-display">{w.name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{w.address}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Manager: <strong className="text-slate-700">{w.manager}</strong>
                </p>

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

                    <div className="flex items-center gap-2 font-sans">
                      <span className="text-xs text-slate-500 font-semibold">{whLocs.length} assigned bins</span>
                      <button
                        type="button"
                        onClick={() => handleOpenAddLocForWH(w.id)}
                        className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold border border-blue-200 transition-colors flex items-center gap-1"
                        title="Add Rack to this Warehouse"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Bin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditWH(w)}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition-colors"
                        title="Edit Warehouse Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWH(w.id, w.name)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                        title="Delete Warehouse"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pl-6 border-l-2 border-blue-300 space-y-2 mt-2">
                    {whLocs.length === 0 ? (
                      <div className="text-slate-400 text-xs italic font-sans flex items-center justify-between py-1">
                        <span>No sub-locations configured.</span>
                        <button
                          type="button"
                          onClick={() => handleOpenAddLocForWH(w.id)}
                          className="text-blue-600 hover:underline font-semibold not-italic"
                        >
                          + Create first rack
                        </button>
                      </div>
                    ) : (
                      whLocs.map((l, idx) => (
                        <div key={l.id} className="group flex items-center justify-between py-1.5 px-2.5 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/80 transition-all shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{idx === whLocs.length - 1 ? '└──' : '├──'}</span>
                            <span className="font-bold text-slate-800">{l.name}</span>
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] rounded font-semibold font-mono">
                              {l.code}
                            </span>
                            <span className="text-slate-400 font-sans text-[11px]">({l.type})</span>
                          </div>

                          <div className="flex items-center gap-3 font-sans text-xs">
                            <span className="text-slate-500 text-[11px]">
                              Cap: <strong className="text-slate-800">{l.capacity}</strong> units
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleOpenEditLoc(l)}
                                title="Edit Rack Location"
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLoc(l.id, l.name)}
                                title="Delete Rack Location"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
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
              <span className="font-bold text-slate-900">{locations.filter(l => l.type === 'Storage').length} Racks</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                <span className="font-semibold text-slate-700">Production Assembly Bins</span>
              </div>
              <span className="font-bold text-slate-900">{locations.filter(l => l.type === 'Production').length} Bins</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                <span className="font-semibold text-slate-700">Receiving Inbound Docks</span>
              </div>
              <span className="font-bold text-slate-900">{locations.filter(l => l.type === 'Receiving Dock').length} Docks</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-600"></span>
                <span className="font-semibold text-slate-700">Dispatch Outbound Bays</span>
              </div>
              <span className="font-bold text-slate-900">{locations.filter(l => l.type === 'Dispatch Dock').length} Bays</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
            <strong className="font-bold text-blue-800">Warehouse Guidelines:</strong>
            <p className="text-blue-700 leading-relaxed text-[11px]">
              Every storage location is assigned a unique barcode shortcode (e.g. R-A01, PR-01) for fast barcode scanning during receiving, transfer staging, and shipment verification.
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

            <form onSubmit={handleSaveNewWH}>
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
                    <CustomSelect
                      value={whForm.type}
                      onChange={(val) => setWhForm({ ...whForm, type: val })}
                      options={[
                        'Distribution Center',
                        'Production & Assembly',
                        'Cross-Dock Hub',
                        'Cold Storage',
                        'Fulfillment Center'
                      ]}
                      size="md"
                    />
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
                  <label className="form-label">Manager Name</label>
                  <input
                    type="text"
                    value={whForm.manager}
                    onChange={(e) => setWhForm({ ...whForm, manager: e.target.value })}
                    placeholder="Operations Manager Name"
                    className="form-control text-xs"
                  />
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

      {/* Edit Warehouse Modal */}
      {isEditWHModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Warehouse Facility ({editWHForm.code})
              </h3>
              <button onClick={() => setIsEditWHModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditWH}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="form-label">Warehouse Name *</label>
                  <input
                    type="text"
                    required
                    value={editWHForm.name}
                    onChange={(e) => setEditWHForm({ ...editWHForm, name: e.target.value })}
                    className="form-control text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Short Code *</label>
                    <input
                      type="text"
                      required
                      value={editWHForm.code}
                      onChange={(e) => setEditWHForm({ ...editWHForm, code: e.target.value.toUpperCase() })}
                      className="form-control text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="form-label">City / Region *</label>
                    <input
                      type="text"
                      required
                      value={editWHForm.city}
                      onChange={(e) => setEditWHForm({ ...editWHForm, city: e.target.value })}
                      className="form-control text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Facility Type</label>
                    <CustomSelect
                      value={editWHForm.type}
                      onChange={(val) => setEditWHForm({ ...editWHForm, type: val })}
                      options={[
                        'Distribution Center',
                        'Production & Assembly',
                        'Cross-Dock Hub',
                        'Cold Storage',
                        'Fulfillment Center'
                      ]}
                      size="md"
                    />
                  </div>
                  <div>
                    <label className="form-label">Capacity (Units)</label>
                    <input
                      type="number"
                      min="500"
                      value={editWHForm.capacity}
                      onChange={(e) => setEditWHForm({ ...editWHForm, capacity: Number(e.target.value) })}
                      className="form-control text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Manager Name</label>
                    <input
                      type="text"
                      value={editWHForm.manager}
                      onChange={(e) => setEditWHForm({ ...editWHForm, manager: e.target.value })}
                      className="form-control text-xs"
                    />
                  </div>
                  <div>
                    <label className="form-label">Operational Status</label>
                    <CustomSelect
                      value={editWHForm.status}
                      onChange={(val) => setEditWHForm({ ...editWHForm, status: val as any })}
                      options={[
                        { value: 'Active', label: 'Active', badge: 'Online', badgeColor: 'bg-emerald-50 text-emerald-700' },
                        { value: 'Maintenance', label: 'Maintenance', badge: 'Maint', badgeColor: 'bg-amber-50 text-amber-700' },
                        { value: 'Inactive', label: 'Inactive', badge: 'Offline', badgeColor: 'bg-rose-50 text-rose-700' }
                      ]}
                      size="md"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Address & Landmark</label>
                  <textarea
                    rows={2}
                    value={editWHForm.address}
                    onChange={(e) => setEditWHForm({ ...editWHForm, address: e.target.value })}
                    className="form-control text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsEditWHModalOpen(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Update Warehouse
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

            <form onSubmit={handleSaveNewLoc}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="form-label">Parent Warehouse *</label>
                  <CustomSelect
                    value={locForm.warehouseId}
                    onChange={(val) => setLocForm({ ...locForm, warehouseId: val })}
                    options={warehouses.map(w => ({
                      value: w.id,
                      label: w.name,
                      subLabel: `${w.city} • ${w.code}`,
                      badge: w.code
                    }))}
                    size="md"
                  />
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
                    <CustomSelect
                      value={locForm.type}
                      onChange={(val) => setLocForm({ ...locForm, type: val as any })}
                      options={[
                        'Storage',
                        'Production',
                        'Receiving Dock',
                        'Dispatch Dock',
                        'Secure Cage'
                      ]}
                      size="md"
                    />
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

      {/* Edit Location Modal */}
      {isEditLocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Storage Location ({editLocForm.code})
              </h3>
              <button onClick={() => setIsEditLocModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLoc}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="form-label">Parent Warehouse *</label>
                  <CustomSelect
                    value={editLocForm.warehouseId}
                    onChange={(val) => setEditLocForm({ ...editLocForm, warehouseId: val })}
                    options={warehouses.map(w => ({
                      value: w.id,
                      label: w.name,
                      subLabel: `${w.city} • ${w.code}`,
                      badge: w.code
                    }))}
                    size="md"
                  />
                </div>

                <div>
                  <label className="form-label">Location / Rack Name *</label>
                  <input
                    type="text"
                    required
                    value={editLocForm.name}
                    onChange={(e) => setEditLocForm({ ...editLocForm, name: e.target.value })}
                    className="form-control text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Short Code *</label>
                    <input
                      type="text"
                      required
                      value={editLocForm.code}
                      onChange={(e) => setEditLocForm({ ...editLocForm, code: e.target.value.toUpperCase() })}
                      className="form-control text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="form-label">Location Type</label>
                    <CustomSelect
                      value={editLocForm.type}
                      onChange={(val) => setEditLocForm({ ...editLocForm, type: val as any })}
                      options={[
                        'Storage',
                        'Production',
                        'Receiving Dock',
                        'Dispatch Dock',
                        'Secure Cage'
                      ]}
                      size="md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Aisle Number</label>
                    <input
                      type="text"
                      value={editLocForm.aisle}
                      onChange={(e) => setEditLocForm({ ...editLocForm, aisle: e.target.value })}
                      className="form-control text-xs"
                    />
                  </div>
                  <div>
                    <label className="form-label">Capacity (Units)</label>
                    <input
                      type="number"
                      min="100"
                      value={editLocForm.capacity}
                      onChange={(e) => setEditLocForm({ ...editLocForm, capacity: Number(e.target.value) })}
                      className="form-control text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsEditLocModalOpen(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Update Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
