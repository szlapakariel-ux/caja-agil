"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MovementCard } from "@/components/movements/movement-card";
import { formatCurrency, formatDateTime, formatTime, PAYMENT_METHOD_LABELS, MOVEMENT_TYPE_LABELS } from "@/lib/format";
import Link from "next/link";

type PendingMovement = {
  id: string;
  code: string;
  type: string;
  amount: number;
  paymentMethod: string;
  createdAt: string;
};

type PendingDialog = {
  open: boolean;
  sessionId: string;
  movements: PendingMovement[];
  step: "choose" | "select";
  selectedIds: Set<string>;
};

type DashboardData = {
  date: string;
  openSession: {
    id: string;
    code: string;
    openedAt: string;
    openingAmount: number;
    openedBy: { name: string };
  } | null;
  summary: {
    sales: number;
    expenses: number;
    ownerWithdrawals: number;
    ownerContributions: number;
    adjustmentsPositive: number;
    adjustmentsNegative: number;
    pendingExpenses: number;
    openingAmount: number;
    expectedBalance: number;
    balanceByPaymentMethod: Record<string, number>;
  };
  recentMovements: unknown[];
  pendingClosures: { id: string; code: string; createdBy: { name: string }; createdAt: string }[];
  totalMovements: number;
};

export default function DashboardPage() {
  const { currentUser } = useUser();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado apertura de caja
  const [openingCaja, setOpeningCaja] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [openingLoading, setOpeningLoading] = useState(false);
  const [openingError, setOpeningError] = useState("");

  // Estado diálogo movimientos sin caja
  const [pendingDialog, setPendingDialog] = useState<PendingDialog>({
    open: false,
    sessionId: "",
    movements: [],
    step: "choose",
    selectedIds: new Set(),
  });
  const [assigningPending, setAssigningPending] = useState(false);
  const [assignResult, setAssignResult] = useState("");

  useEffect(() => {
    if (!currentUser) router.replace("/");
  }, [currentUser, router]);

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) fetchDashboard();
  }, [currentUser, fetchDashboard]);

  const handleOpenCaja = async () => {
    if (!currentUser) return;
    setOpeningLoading(true);
    setOpeningError("");
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        openingAmount: parseFloat(openingAmount) || 0,
        notes: openingNotes,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setOpeningCaja(false);
      setOpeningAmount("");
      setOpeningNotes("");
      await fetchDashboard();
      // Si hay movimientos sin caja, mostrar diálogo de decisión
      if (json.pendingMovements?.length > 0) {
        setPendingDialog({
          open: true,
          sessionId: json.session.id,
          movements: json.pendingMovements,
          step: "choose",
          selectedIds: new Set(),
        });
      }
    } else {
      setOpeningError(json.error ?? "Error al abrir caja");
    }
    setOpeningLoading(false);
  };

  const handleAssignPending = async (ids: string[]) => {
    if (!currentUser) return;
    setAssigningPending(true);
    const res = await fetch("/api/sessions/assign-pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        sessionId: pendingDialog.sessionId,
        movementIds: ids,
        action: "assign",
      }),
    });
    setAssigningPending(false);
    if (res.ok) {
      const count = ids.length;
      setAssignResult(`✓ ${count} movimiento(s) asignado(s) a la caja del día`);
      setPendingDialog((d) => ({ ...d, open: false }));
      fetchDashboard();
    }
  };

  const closePendingDialog = () => {
    setPendingDialog((d) => ({ ...d, open: false }));
    setAssignResult("");
  };

  const toggleSelectId = (id: string) => {
    setPendingDialog((d) => {
      const next = new Set(d.selectedIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...d, selectedIds: next };
    });
  };

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "ADMIN";
  const summary = data?.summary;
  const pendingClosuresCount = data?.pendingClosures?.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <Header title="Panel del día" />

      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">

        {/* Estado de caja */}
        <Card>
          <CardBody className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${data?.openSession ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {data?.openSession ? `Caja abierta — ${data.openSession.code}` : "Sin caja abierta"}
                </span>
              </div>
              {data?.openSession && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-4">
                  Apertura: {formatDateTime(data.openSession.openedAt)} · {data.openSession.openedBy.name} · Inicial: {formatCurrency(data.openSession.openingAmount)}
                </p>
              )}
              {!data?.openSession && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-4">
                  Los movimientos se registrarán como "sin caja abierta"
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!data?.openSession && isAdmin && (
                <Button variant="success" size="sm" onClick={() => setOpeningCaja(true)}>
                  Abrir caja
                </Button>
              )}
              {data?.openSession && isAdmin && (
                <Link href="/closures"><Button variant="secondary" size="sm">Cierre</Button></Link>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Resultado de asignación de movimientos previos */}
        {assignResult && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-green-600 text-lg">✓</span>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">{assignResult}</p>
            <button onClick={() => setAssignResult("")} className="ml-auto text-green-500 hover:text-green-700">✕</button>
          </div>
        )}

        {/* Modal abrir caja */}
        {openingCaja && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpeningCaja(false)} />
            <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Abrir caja</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Saldo inicial ($)</label>
                  <input type="number" min="0" placeholder="0" value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Observación (opcional)</label>
                  <input type="text" placeholder="Ej: Caja del turno mañana" value={openingNotes}
                    onChange={(e) => setOpeningNotes(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {openingError && <p className="text-sm text-red-500">{openingError}</p>}
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setOpeningCaja(false)}>Cancelar</Button>
                  <Button variant="success" className="flex-1" loading={openingLoading} onClick={handleOpenCaja}>Abrir caja</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Diálogo: movimientos sin caja abierta detectados al abrir caja */}
        {pendingDialog.open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Movimientos sin caja abierta
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Se encontraron <strong>{pendingDialog.movements.length}</strong> movimiento(s) registrado(s) antes de abrir esta caja. ¿Qué querés hacer?
                </p>

                {pendingDialog.step === "choose" && (
                  <div className="flex flex-col gap-3 mt-5">
                    <button
                      onClick={() => handleAssignPending(pendingDialog.movements.map((m) => m.id))}
                      disabled={assigningPending}
                      className="w-full text-left rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-600 px-4 py-4 transition-colors"
                    >
                      <p className="font-semibold text-blue-800 dark:text-blue-200">
                        A) Asignar todos a la caja del día
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Los {pendingDialog.movements.length} movimiento(s) quedarán vinculados a esta caja.
                      </p>
                    </button>

                    <button
                      onClick={closePendingDialog}
                      className="w-full text-left rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 px-4 py-4 transition-colors"
                    >
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        B) Dejarlos separados
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Quedan marcados como "sin caja abierta". No se asignan automáticamente.
                      </p>
                    </button>

                    <button
                      onClick={() => setPendingDialog((d) => ({ ...d, step: "select" }))}
                      className="w-full text-left rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 hover:border-purple-400 dark:hover:border-purple-600 px-4 py-4 transition-colors"
                    >
                      <p className="font-semibold text-purple-800 dark:text-purple-200">
                        C) Revisarlos uno por uno
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Seleccioná cuáles querés asignar a esta caja.
                      </p>
                    </button>
                  </div>
                )}

                {pendingDialog.step === "select" && (
                  <div className="mt-5">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Seleccioná los movimientos a asignar:
                    </p>
                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                      {pendingDialog.movements.map((mov) => (
                        <label key={mov.id} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                          <input
                            type="checkbox"
                            checked={pendingDialog.selectedIds.has(mov.id)}
                            onChange={() => toggleSelectId(mov.id)}
                            className="w-4 h-4 rounded text-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-mono text-gray-400">{mov.code}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
                              {MOVEMENT_TYPE_LABELS[mov.type] ?? mov.type}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(mov.amount)}
                          </span>
                          <span className="text-xs text-gray-400">{formatTime(mov.createdAt)}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button variant="secondary" className="flex-1"
                        onClick={() => setPendingDialog((d) => ({ ...d, step: "choose" }))}>
                        ← Volver
                      </Button>
                      <Button variant="primary" className="flex-1"
                        loading={assigningPending}
                        disabled={pendingDialog.selectedIds.size === 0}
                        onClick={() => handleAssignPending(Array.from(pendingDialog.selectedIds))}>
                        Asignar seleccionados ({pendingDialog.selectedIds.size})
                      </Button>
                    </div>
                    <button onClick={closePendingDialog} className="w-full text-sm text-gray-400 hover:text-gray-600 mt-2 text-center">
                      Dejar todos separados
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alertas */}
        {(summary?.pendingExpenses ?? 0) > 0 && isAdmin && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {summary?.pendingExpenses} egreso(s) pendiente(s) de revisión
              </p>
            </div>
            <Link href="/history"><Button variant="secondary" size="sm">Revisar</Button></Link>
          </div>
        )}

        {pendingClosuresCount > 0 && isAdmin && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-blue-600 dark:text-blue-400 text-xl">📋</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {pendingClosuresCount} cierre(s) parcial(es) pendiente(s) de revisión
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                {data?.pendingClosures?.map((c) => `${c.code} (${c.createdBy.name})`).join(", ")}
              </p>
            </div>
            <Link href="/closures"><Button variant="secondary" size="sm">Revisar</Button></Link>
          </div>
        )}

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/movements/new/sale">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-5 flex flex-col items-center gap-2 transition-colors shadow-sm">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-semibold text-base">Registrar venta</span>
            </button>
          </Link>
          <Link href="/movements/new/expense">
            <button className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-5 flex flex-col items-center gap-2 transition-colors shadow-sm">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              <span className="font-semibold text-base">Registrar egreso</span>
            </button>
          </Link>
          {isAdmin && (
            <>
              <Link href="/movements/new/owner-withdrawal">
                <button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-4 flex flex-col items-center gap-1.5 transition-colors shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-sm">Retiro dueña</span>
                </button>
              </Link>
              <Link href="/movements/new/owner-contribution">
                <button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-2xl py-4 flex flex-col items-center gap-1.5 transition-colors shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-medium text-sm">Aporte dueña</span>
                </button>
              </Link>
              <Link href="/movements/new/adjustment">
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-2xl py-4 flex flex-col items-center gap-1.5 transition-colors shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="font-medium text-sm">Ajuste de caja</span>
                </button>
              </Link>
              <Link href="/closures">
                <button className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-2xl py-4 flex flex-col items-center gap-1.5 transition-colors shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-sm">Cierre de caja</span>
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Resumen del día */}
        <Card>
          <CardHeader>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Resumen del día</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ventas</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">{formatCurrency(summary?.sales ?? 0)}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">Egresos</p>
                <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-0.5">{formatCurrency(summary?.expenses ?? 0)}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Retiros</p>
                <p className="text-lg font-bold text-orange-700 dark:text-orange-300 mt-0.5">{formatCurrency(summary?.ownerWithdrawals ?? 0)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Aportes</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-0.5">{formatCurrency(summary?.ownerContributions ?? 0)}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Saldo esperado</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(summary?.expectedBalance ?? 0)}</span>
              </div>
              {(summary?.openingAmount ?? 0) > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Saldo inicial: {formatCurrency(summary?.openingAmount ?? 0)}
                </p>
              )}
            </div>

            {summary?.balanceByPaymentMethod && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Por medio de pago</p>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(summary.balanceByPaymentMethod)
                    .filter(([, v]) => (v as number) !== 0)
                    .map(([method, amount]) => (
                      <div key={method} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{PAYMENT_METHOD_LABELS[method] ?? method}</span>
                        <span className={(amount as number) >= 0 ? "font-medium text-gray-900 dark:text-gray-100" : "font-medium text-red-600 dark:text-red-400"}>
                          {formatCurrency(amount as number)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Últimos movimientos */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Últimos movimientos</h2>
            <Link href="/history" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Ver todos</Link>
          </div>
          {(data?.recentMovements?.length ?? 0) === 0 ? (
            <Card><CardBody><p className="text-center text-gray-400 py-4">No hay movimientos hoy</p></CardBody></Card>
          ) : (
            <div className="flex flex-col gap-2">
              {(data?.recentMovements as Parameters<typeof MovementCard>[0]["movement"][])?.map((mov) => (
                <MovementCard
                  key={(mov as { id: string }).id}
                  movement={mov as Parameters<typeof MovementCard>[0]["movement"]}
                  onClick={() => router.push(`/movements/${(mov as { id: string }).id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
