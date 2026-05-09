"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "MERCADO_PAGO", "OTHER"] as const;

export default function NewExpensePage() {
  const { currentUser } = useUser();
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!amount || parseFloat(amount) <= 0) {
      setError("Ingresá un monto válido");
      return;
    }
    if (!description.trim()) {
      setError("La descripción es requerida para egresos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          type: "EXPENSE",
          amount: parseFloat(amount),
          paymentMethod,
          description: description.trim(),
        }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error ?? "Error al registrar");
      }
    } finally {
      setLoading(false);
    }
  };

  const isEmployee = currentUser?.role === "EMPLOYEE";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header title="Nuevo egreso" />

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 flex flex-col gap-6">

          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Registrar egreso</h1>
            {isEmployee && (
              <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-3 py-2">
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  ⚠️ Los egresos cargados por empleados quedan pendientes de aprobación de Vanina
                </p>
              </div>
            )}
          </div>

          {/* Monto */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Monto *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-bold">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-full rounded-xl border pl-9 pr-4 py-4 text-2xl font-bold bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Descripción *
            </label>
            <input
              type="text"
              placeholder="Ej: Pago proveedor papelería, pago luz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Medio de pago */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Medio de pago *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl py-3 px-4 text-sm font-medium transition-all border ${
                    paymentMethod === method
                      ? "bg-red-500 text-white border-red-500 shadow-sm"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-red-300"
                  }`}
                >
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-grow-2"
              loading={loading}
              onClick={handleSubmit}
              disabled={!amount || parseFloat(amount) <= 0 || !description.trim()}
            >
              Guardar egreso
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
