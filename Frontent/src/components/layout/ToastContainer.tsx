import React from 'react';
import { useStockSense } from '../../context/StockSenseContext';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStockSense();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-white rounded-2xl p-3.5 shadow-xl border flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-bottom-5 ${
            toast.type === 'success' ? 'border-emerald-200 border-l-4 border-l-emerald-600' :
            toast.type === 'danger' ? 'border-red-200 border-l-4 border-l-red-600' :
            toast.type === 'warning' ? 'border-amber-200 border-l-4 border-l-amber-600' :
            'border-blue-200 border-l-4 border-l-blue-600'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {toast.type === 'danger' && <AlertOctagon className="w-4 h-4 text-red-600" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
          </div>
          <p className="text-xs font-semibold text-slate-800 flex-1 leading-snug">
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
