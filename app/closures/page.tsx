"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/format";

type Closure = {
  id: string;
  code: string;
  type: "PARTIAL" | "FINAL";
  expectedTotal: number;
  countedTotal: number;
  differenceTotal: number;
  notes: string | null;
  status: "PENDING_REVIEW" | "APPROVED" | "CORRECTED";
  createdAt: string;
  reviewedAt: string | null;
  createdBy: { name: string };
  reviewedBy: { name: string } | null;
};

type DashboardSummary = {
  openSession: { id: string; code: string } | null;
  summary: { expectedBalance: number };
};

export default function ClosuresPage() {
  const { currentUser } = useUser();
  const router = useRouter();

  const [closures, setClosures] = useState<Closure[]>([]);
  const [dashData, setDashData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState<"PARTIAL" | "FINAL" | null>(null);
  const [countedTotal, setCountedTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    const [closuresRes, dashRes] = await Promise.all([
      fetch("/api/closures"),
      fetch("/api/dashboard"),
    ]);
    const [closuresData, dashboardData] = await Promise.all([closuresRes.json(), dashRes.json()]);
    setClosures(closuresData);
    setDashData(dashboardData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUser) { router.replace("/"); return; }
    fetchData();
  }, [currentUser, fetchData, router]);

  const isAdmin = currentUser?.role === "ADMIN";

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!countedTotal || parseFloat(countedTotal) < 0) {
      setError("Ingresá un monto válido");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/closures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        type: showForm,
        countedTotal: parseFloat(countedTotal),
        notes: notes.trim() || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setShowForm(null);
      setCountedTotal("");
      setNotes("");
      fetchData();
    } else {
      setError(data.error ?? "Error al crear cierre");
    }
    setSubmitting(false);
  };

  const handleApprove = async (closureId: string) => {
    if (!currentUser) return;
    await fetch(`/api/closures/${closureId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, action: "approve" }),
    });
    fetchData();
  };

  const expectedBalance = dashData?.summary?.expectedBalance ?? 0;
  const counted = parseFloat(countedTotal) || 0;
  const previewDiff = counted - expectedBalance;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <Header title="Cierres de caja" />

      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Acciones */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => { setShowForm("PARTIAL"); setCountedTotal(""); setNotes(""); setError(""); }}
          >
            📋 Cierre parcial
          </Button>
          {isAdmin && (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => { setShowForm("FINAL"); setCountedTotal(""); setNotes(""); setError(""); }}
            >
              🔒 Cierre final
            </Button>
          )}
        </div>

        {/* Formulario de cierre */}
        {showForm && (
          <Card>
            <CardHeader>
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                {showForm === "PARTIAL" ? "Cierre parcial" : "Cierre final"}
              </h2>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {!isAdmin && showForm === "PARTIAL" && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-3 py-2">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    ⚠️ Este cierre parcial quedará pendiente de revisión de Vanina
                  </p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">Saldo esperado del sistema</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {formatCurrency(expectedBalance)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Monto contado * (total físico en caja)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-bold">$</span>
                  <input
                    type="number" min="0" step="0.01" placeholder="0"
                    value={countedTotal} onChange={(e) => setCountedTotal(e.target.value)} autoFocus
                    className="w-full rounded-xl border pl-9 pr-4 py-4 text-2xl font-bold bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {countedTotal && (
                <div className={`rounded-xl px-4 py-3 ${previewDiff >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Diferencia</p>
                  <p className={`text-xl font-bold mt-0.5 ${previewDiff >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                    {previewDiff >= 0 ? "+" : ""}{formatCurrency(previewDiff)}
                    <span className="text-sm font-normal ml-2">
                      {previewDiff > 0 ? "sobrante" : previewDiff < 0 ? "faltante" : "exacto"}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Observación (opcional)
                </label>
                <input type="text" placeholder="Ej: Faltante de bolsillos revisado..." value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowForm(null)}>Cancelar</Button>
                <Button variant="primary" className="flex-1" loading={submitting} onClick={handleSubmit}
                  disabled={!countedTotal}>
                  Confirmar {showForm === "PARTIAL" ? "cierre parcial" : "cierre final"}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Historial de cierres */}
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-2 px-1">Historial de cierres</h2>
          {closures.length === 0 ? (
            <Card><CardBody><p className="text-center text-gray-400 py-4">No hay cierres registrados</p></CardBody></Card>
          ) : (
            <div className="flex flex-col gap-2">
              {closures.map((c) => (
                <Card key={c.id}>
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-gray-400">{c.code}</span>
                          <Badge color={c.type === "FINAL" ? "blue" : "gray"}>
                            {c.type === "FINAL" ? "Cierre final" : "Cierre parcial"}
                          </Badge>
                          <Badge color={c.status === "APPROVED" ? "green" : c.status === "PENDING_REVIEW" ? "yellow" : "gray"}>
                            {c.status === "APPROVED" ? "Aprobado" : c.status === "PENDING_REVIEW" ? "Pendiente" : "Corregido"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Esperado</p>
                            <p className="font-medium">{formatCurrency(c.expectedTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Contado</p>
                            <p className="font-medium">{formatCurrency(c.countedTotal)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Diferencia</p>
                            <p className={`font-bold ${c.differenceTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {c.differenceTotal >= 0 ? "+" : ""}{formatCurrency(c.differenceTotal)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {formatDateTime(c.createdAt)} · {c.createdBy.name}
                        </p>
                        {c.notes && <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5">"{c.notes}"</p>}
                      </div>
                      {isAdmin && c.status === "PENDING_REVIEW" && (
                        <Button size="sm" variant="success" onClick={() => handleApprove(c.id)}>Aprobar</Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
