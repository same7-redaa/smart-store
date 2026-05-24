import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
  id: number;
}

interface AppContextType {
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
  confirm: (options: ConfirmOptions) => void;
  currentNotification: Notification | null;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { visible: boolean }) | null>(null);
  const confirmCbRef = useRef<(() => void) | null>(null);

  const notify = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setNotification({ type, message, id });
    setTimeout(() => setNotification(prev => prev?.id === id ? null : prev), 3000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    confirmCbRef.current = options.onConfirm;
    setConfirmState({ ...options, visible: true });
  }, []);

  const rejectConfirm = useCallback(() => {
    confirmCbRef.current = null;
    setConfirmState(null);
  }, []);

  const resolveConfirm = useCallback(() => {
    confirmCbRef.current?.();
    confirmCbRef.current = null;
    setConfirmState(null);
  }, []);

  const value = useMemo(() => ({ notify, confirm, currentNotification: notification }), [notify, confirm, notification]);

  return (
    <AppContext.Provider value={value}>
      {children}

      {confirmState && confirmState.visible && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center p-4" onClick={rejectConfirm}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{confirmState.title}</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmState.message}</p>
            <div className="flex gap-3">
              <button onClick={resolveConfirm} className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">تأكيد</button>
              <button onClick={rejectConfirm} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};
