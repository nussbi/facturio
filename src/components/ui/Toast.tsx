"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type Toast = { id: string; title: string; variant?: "success" | "error" | "info"; timeout?: number };

type ToastCtx = { toasts: Toast[]; show: (t: Omit<Toast, "id">) => void; remove: (id: string) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show: ToastCtx["show"] = (t) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, timeout: 3200, variant: "info" as const, ...t };
    setToasts((prev) => [...prev, toast]);
    window.setTimeout(() => remove(id), toast.timeout!);
  };
  const remove: ToastCtx["remove"] = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));
  const value = useMemo(() => ({ toasts, show, remove }), [toasts]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`relative min-w-[240px] rounded-lg border px-3 py-2 shadow-md bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 ${
            t.variant === "success" ? "border-emerald-300" : t.variant === "error" ? "border-rose-300" : "border-indigo-200"
          }`}>
            <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-lg bg-gradient-to-b from-indigo-500 to-cyan-500" />
            <div className="text-sm font-medium text-gray-900">
              {t.title}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
