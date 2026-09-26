import React from 'react';
import { useStockSense } from '../../context/StockSenseContext';
import {
  LayoutDashboard,
  Package,
  Layers,
  Sliders,
  ArrowDownLeft,
  Truck,
  ArrowLeftRight,
  History,
  Building2,
  Tags,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Boxes
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed: externalCollapsed,
  setCollapsed: externalSetCollapsed,
  mobileOpen: externalMobileOpen,
  setMobileOpen: externalSetMobileOpen
}) => {
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = React.useState(false);

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setCollapsed = externalSetCollapsed || setInternalCollapsed;
  const mobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  const setMobileOpen = externalSetMobileOpen || setInternalMobileOpen;

  const { activeView, setActiveView, getKPIs, currentUser, logout } = useStockSense();
  const kpis = getKPIs();

  const navItems = [
    { section: 'Overview', items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
    ]},
    { section: 'Products & Stock', items: [
      { id: 'products', label: 'Products Master', icon: Package, badge: kpis.totalProducts },
      { id: 'stock', label: 'Stock Matrix', icon: Layers },
      { id: 'categories', label: 'Categories', icon: Tags },
      { id: 'rules', label: 'Reordering Rules', icon: Sliders }
    ]},
    { section: 'Operations', items: [
      { id: 'receipts', label: 'Receipts (Inbound)', icon: ArrowDownLeft, badge: kpis.pendingReceipts > 0 ? `${kpis.pendingReceipts} req` : undefined, badgeColor: 'bg-blue-100 text-blue-700' },
      { id: 'deliveries', label: 'Delivery Orders (Out)', icon: Truck, badge: kpis.pendingDeliveries > 0 ? `${kpis.pendingDeliveries} due` : undefined, badgeColor: 'bg-indigo-100 text-indigo-700' },
      { id: 'transfers', label: 'Transfers & Adjustments', icon: ArrowLeftRight }
    ]},
    { section: 'Audit & Network', items: [
      { id: 'history', label: 'Move History & Ledger', icon: History },
      { id: 'warehouses', label: 'Warehouses & Locations', icon: Building2 }
    ]}
  ];

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 bg-white border-r border-slate-200 z-50 flex flex-col justify-between transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-0.5 shadow-sm border border-slate-200 shrink-0 overflow-hidden">
              <img src="/invexa_logo.png" alt="INVEXA Logo" className="w-full h-full object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-display font-extrabold text-base text-slate-900 tracking-tight leading-none block">
                  INVEXA
                </span>
                <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase block mt-0.5">
                  Inventory System
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {group.section}
                </div>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 shadow-xs border border-blue-100/60 font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between text-left truncate">
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              item.badgeColor || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 shrink-0">
          <div
            onClick={() => handleNavClick('profile')}
            className={`flex items-center gap-3 p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.fullName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100 shrink-0"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  {currentUser.role}
                </span>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
