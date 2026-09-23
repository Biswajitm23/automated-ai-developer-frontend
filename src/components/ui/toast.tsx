"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconButton } from "./icon-button";
import { Icon, type IconName } from "./icons";
import styles from "./toast.module.css";

export type ToastVariant = "success" | "error" | "info";

export type ToastOptions = {
  variant: ToastVariant;
  message: string;
  durationMs?: number;
};

type ToastItem = Required<ToastOptions> & { id: number };

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, IconName> = {
  success: "check-circle",
  error: "alert-circle",
  info: "info",
};

const DEFAULT_DURATION_MS = 5000;

/**
 * Holds the toast stack. Mounted in the protected layout (above the shell), so
 * a toast survives router.push. Toasts are never the only feedback for errors.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const item: ToastItem = {
      id: nextId.current++,
      variant: options.variant,
      message: options.message,
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
    };
    // Keep at most 4 toasts on screen.
    setToasts((current) => [...current.slice(-3), item]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} aria-live="polite" aria-relevant="additions text">
        <ol className={styles.stack} role="list">
          {toasts.map((item) => (
            <ToastView key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </ol>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.durationMs);

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(1000, remaining.current - (Date.now() - started));
    };
  }, [paused, item.id, onDismiss]);

  return (
    <li
      className={[styles.toast, styles[item.variant]].join(" ")}
      data-testid="toast"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <Icon name={ICONS[item.variant]} size={20} className={styles.icon} />
      <p className={styles.message}>{item.message}</p>
      <IconButton
        icon="close"
        label="Dismiss notification"
        size="sm"
        onClick={() => onDismiss(item.id)}
      />
    </li>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}
