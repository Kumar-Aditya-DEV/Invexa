import React, { useState } from 'react';
import { useStockSense } from '../../context/StockSenseContext';
import {
  Menu,
  Search,
  Warehouse as WarehouseIcon,
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  QrCode,
  RotateCcw
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu = () => {} }) => {
  const {
    warehouses,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveView,
    setIsCommandPaletteOpen,
    currentUser,
    resetAllData
  } = useStockSense();

  const [selectedWH, setSelectedWH] = useState(warehouses[0]?.name || 'Main Warehouse');
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifClick = (id: string, link: string) => {
    markNotificationRead(id);
    setIsNotifOpen(false);
    setActiveView(link);
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left Section: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar (Trigger for Command Palette) */}
        <div
          onClick={() => setIsCommandPaletteOpen(true)}
          className="relative flex-1 max-w-md flex items-center bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer transition-all text-slate-400 group"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 mr-2 shrink-0" />
          <span className="text-xs text-slate-500 font-medium truncate flex-1">
            Search SKU, batch, product, or order...
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white rounded border border-slate-300 shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Section: Warehouse selector, Quick Action, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Warehouse Selector */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
          <WarehouseIcon className="w-3.5 h-3.5 text-blue-600" />
          <select
            value={selectedWH}
            onChange={(e) => setSelectedWH(e.target.value)}
            className="bg-transparent text-xs font-semibold outline-none cursor-pointer"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.name}>
                {w.code} — {w.shortName}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Demo Data Button */}
        <button
          onClick={resetAllData}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors text-xs font-medium"
          title="Reset to Initial Enterprise Seed Data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo</span>
        </button>

        {/* Barcode Quick Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
        >
          <QrCode className="w-4 h-4" />
          <span>Quick Scan</span>
        </button>

        {/* Notifications Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Card */}
          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Notifications & Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n.id, n.link)}
                      className={`p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                        n.read ? 'opacity-60' : 'bg-blue-50/20'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        n.type === 'danger' ? 'bg-red-100 text-red-600' :
                        n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                        n.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {n.type === 'danger' && <AlertOctagon className="w-4 h-4" />}
                        {n.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                        {n.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                        {n.type === 'info' && <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-tight">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Pill */}
        <div
          onClick={() => setActiveView('profile')}
          className="flex items-center gap-2 pl-2 cursor-pointer select-none"
          title="Open Profile Settings"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.fullName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100 shadow-xs"
          />
        </div>
      </div>
    </header>
  );
};
