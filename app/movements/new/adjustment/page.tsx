"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "MERCADO_PAGO", "OTHER"] as const;

export default function AdjustmentPage() {
  const { currentUser } = useUser();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"POSITIVE" | "NEGATIVE">("POSITIVE");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN") router.replace("/dashboard");
  }, [currentUser, router]);

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!amount || parseFloat(amount) <= 0) { setError("Ingresá un monto válido"); return; }
    if (!description.trim()) { setError("El motivo es obligatorio para ajustes de caja"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          type: "CASH_ADJUSTMENT",
          amount: parseFloat(amount),
          paymentMethod,
          description: description.trim(),
          adjustmentDirection: direction,
        }),
      });
      if (res.ok) { router.push("/dashboard"); }
      else { const data = await res.json(); setError(data.error ?? "Error al registrar"); }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header title="Ajuste de caja" />
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 flex flex-col gap-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ajuste de caja</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Para corregir diferencias reales. Requiere motivo.</p>
          </div>

          {/* Dirección del ajuste */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tipo de ajuste *</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDirection("POSITIVE")}
                className={`rounded-xl py-4 px-4 flex flex-col items-center gap-1 font-medium transition-all border ${direction === "POSITIVE" ? "bg-green-600 text-white border-green-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}>
                <span className="text-2xl">+</span>
                <span className="text-sm">Sobrante</span>
              </button>
              <button onClick={() => setDirection("NEGATIVE")}
                className={`rounded-xl py-4 px-4 flex flex-col items-center gap-1 font-medium transition-all border ${direction === "NEGATIVE" ? "bg-red-500 text-white border-red-500" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"}`}>
                <span className="text-2xl">−</span>
                <span className="text-sm">Faltante</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Monto *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-bold">$</span>
              <input type="number" min="0.01" step="0.01" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
                className="w-full rounded-xl border pl-9 pr-4 py-4 text-2xl font-bold bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Motivo * <span className="text-xs text-gray-400">(obligatorio)</span>
            </label>
            <input type="text" placeholder="Ej: Sobrante detectado en conteo de caja" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Medio de pago *</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl py-3 px-4 text-sm font-medium transition-all border ${paymentMethod === method ? "bg-purple-600 text-white border-purple-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-300"}`}>
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3"><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
            <Button style={{ backgroundColor: "#9333ea" }} size="lg" className="flex-grow-2 text-white" loading={loading} onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0 || !description.trim()}>
              Guardar ajuste
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
