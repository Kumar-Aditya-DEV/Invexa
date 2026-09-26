import React from 'react';
import { StockSenseProvider, useStockSense } from './context/StockSenseContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { CommandPalette } from './components/layout/CommandPalette';
import { ToastContainer } from './components/layout/ToastContainer';

// Views
import { DashboardView } from './components/views/DashboardView';
import { ProductsView } from './components/views/ProductsView';
import { StockView } from './components/views/StockView';
import { WarehousesView } from './components/views/WarehousesView';
import { ReceiptsView } from './components/views/ReceiptsView';
import { DeliveriesView } from './components/views/DeliveriesView';
import { TransfersView } from './components/views/TransfersView';
import { HistoryLedgerView } from './components/views/HistoryLedgerView';
import { CategoriesRulesView } from './components/views/CategoriesRulesView';
import { ProfileView } from './components/views/ProfileView';
import { AuthView } from './components/views/AuthView';

const MainLayout: React.FC = () => {
  const { activeView } = useStockSense();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'products':
        return <ProductsView />;
      case 'stock':
        return <StockView />;
      case 'warehouses':
        return <WarehousesView />;
      case 'receipts':
        return <ReceiptsView />;
      case 'deliveries':
        return <DeliveriesView />;
      case 'transfers':
      case 'adjustments':
        return <TransfersView />;
      case 'history':
      case 'ledger':
        return <HistoryLedgerView />;
      case 'categories':
      case 'rules':
        return <CategoriesRulesView />;
      case 'profile':
        return <ProfileView />;
      case 'auth':
      case 'login':
        return <AuthView />;
      default:
        return <DashboardView />;
    }
  };

  // If on Auth view standalone
  if (activeView === 'auth' || activeView === 'login') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-6 px-4">
        <AuthView />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Persistent Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Operational Navigation Bar */}
          <Navbar />

          {/* Dynamic Module Workspace */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in pb-16">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* Global Command Spotlight Palette (⌘K / Ctrl+K) */}
      <CommandPalette />

      {/* Semantic Notification Toasts */}
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <StockSenseProvider>
      <MainLayout />
    </StockSenseProvider>
  );
}

export default App;
