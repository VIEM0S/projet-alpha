import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextType {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  warning: (msg: string) => void;
  info:    (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: Toast['type']) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const colors: Record<Toast['type'], { bg: string; border: string; color: string; icon: string }> = {
    success: { bg: '#F0FBF4', border: '#6ee7b7', color: '#1B4332', icon: '✓' },
    error:   { bg: '#FEF2F2', border: '#fca5a5', color: '#DC2626', icon: '✗' },
    warning: { bg: '#FFFBEB', border: '#fcd34d', color: '#D97706', icon: '⚠' },
    info:    { bg: '#EFF6FF', border: '#93c5fd', color: '#1D4ED8', icon: 'ℹ' },
  };

  return (
    <ToastContext.Provider value={{
      success: (m) => add(m, 'success'),
      error:   (m) => add(m, 'error'),
      warning: (m) => add(m, 'warning'),
      info:    (m) => add(m, 'info'),
    }}>
      {children}

      {/* Conteneur des toasts */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1px solid ${c.border}`, color: c.color,
              borderRadius: 8, padding: '12px 16px', fontSize: 13.5,
              boxShadow: '0 4px 12px rgba(0,0,0,.1)',
              display: 'flex', alignItems: 'center', gap: 10,
              minWidth: 260, maxWidth: 380,
              animation: 'slideIn .2s ease',
            }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{c.icon}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être dans ToastProvider');
  return ctx;
};
