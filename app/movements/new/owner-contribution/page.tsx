"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "MERCADO_PAGO", "OTHER"] as const;

export default function OwnerContributionPage() {
  const { currentUser } = useUser();
  const router = useRouter();
  const [amount, setAmount] = useState("");
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
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, type: "OWNER_CONTRIBUTION", amount: parseFloat(amount), paymentMethod, description: description.trim() || null }),
      });
      if (res.ok) { router.push("/dashboard"); }
      else { const data = await res.json(); setError(data.error ?? "Error al registrar"); }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header title="Aporte de dueña" />
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 flex flex-col gap-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Aporte de dueña</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Solo disponible para admin</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Monto *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-bold">$</span>
              <input type="number" min="0.01" step="0.01" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
                className="w-full rounded-xl border pl-9 pr-4 py-4 text-2xl font-bold bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Observación (opcional)</label>
            <input type="text" placeholder="Ej: Aporte para mercadería" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Medio de pago *</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl py-3 px-4 text-sm font-medium transition-all border ${paymentMethod === method ? "bg-green-600 text-white border-green-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-green-300"}`}>
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3"><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
            <Button variant="success" size="lg" className="flex-grow-2" loading={loading} onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0}>
              Guardar aporte
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
