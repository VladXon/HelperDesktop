import type * as React from 'react';
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title?: string;
  description: string;
}

interface ToastContextValue {
  toast: (p: { variant?: ToastVariant; title?: string; description: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const iconMap: Record<ToastVariant, React.JSX.Element> = {
  success: <CheckCircle size={16} weight="fill" className="text-green-400" />,
  error: <WarningCircle size={16} weight="fill" className="text-red-400" />,
  info: <Info size={16} weight="fill" className="text-accent" />,
};

const bgMap: Record<ToastVariant, string> = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-accent/30 bg-accent/10',
};

function ToastItemView({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex items-start gap-2.5 rounded-lg border ${bgMap[item.variant]} backdrop-blur-xl px-4 py-3 min-w-[280px] max-w-[400px] shadow-lg`}
    >
      <span className="mt-0.5 shrink-0">{iconMap[item.variant]}</span>
      <div className="flex-1 min-w-0">
        {item.title ? <p className="text-sm font-medium text-text-primary">{item.title}</p> : null}
        <p className="text-xs text-text-secondary">{item.description}</p>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="shrink-0 opacity-40 hover:opacity-100 transition-opacity"
      >
        <X size={12} weight="bold" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
  }, []);

  const toast = useCallback((p: { variant?: ToastVariant; title?: string; description: string }) => {
    const id = nextId++;
    const variant = p.variant ?? 'info';
    setToasts((prev) => [...prev, { id, variant, title: p.title, description: p.description }]);
    const timer = setTimeout(() => remove(id), 4000);
    timersRef.current.set(id, timer);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {toasts.map((item) => (
                <ToastItemView key={item.id} item={item} onRemove={remove} />
              ))}
            </AnimatePresence>
          </div>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
