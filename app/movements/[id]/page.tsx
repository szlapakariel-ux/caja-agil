"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  formatCurrency,
  formatDateTime,
  PAYMENT_METHOD_LABELS,
  MOVEMENT_TYPE_LABELS,
} from "@/lib/format";
import { MovementStatusBadge, MovementTypeBadge } from "@/components/movements/movement-badge";

type AuditLog = {
  id: string;
  action: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string | null;
  createdAt: string;
  performedBy: { name: string };
};

type Movement = {
  id: string;
  code: string;
  type: string;
  amount: number;
  paymentMethod: string;
  description: string | null;
  status: "ACTIVE" | "CORRECTED" | "VOIDED";
  approvalStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  withoutCashSession: boolean;
  adjustmentDirection: "POSITIVE" | "NEGATIVE" | null;
  correctionReason: string | null;
  voidReason: string | null;
  originalAmount: number | null;
  createdAt: string;
  voidedAt: string | null;
  createdBy: { name: string; role: string };
  approvedBy: { name: string } | null;
  rejectedBy: { name: string } | null;
  auditLogs: AuditLog[];
};

export default function MovementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useUser();
  const router = useRouter();

  const [movement, setMovement] = useState<Movement | null>(null);
  const [loading, setLoading] = useState(true);

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  const [correctOpen, setCorrectOpen] = useState(false);
  const [correctAmount, setCorrectAmount] = useState("");
  const [correctDescription, setCorrectDescription] = useState("");
  const [correctReason, setCorrectReason] = useState("");
  const [correctPaymentMethod, setCorrectPaymentMethod] = useState("");
  const [correctLoading, setCorrectLoading] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectStep, setRejectStep] = useState<"choose" | "void" | "correct" | "adjust">("choose");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAmount, setRejectAmount] = useState("");
  const [rejectDescription, setRejectDescription] = useState("");
  const [rejectPaymentMethod, setRejectPaymentMethod] = useState("");
  const [rejectAdjDirection, setRejectAdjDirection] = useState<"POSITIVE" | "NEGATIVE">("NEGATIVE");
  const [rejectLoading, setRejectLoading] = useState(false);

  const [actionError, setActionError] = useState("");

  const fetchMovement = useCallback(async () => {
    const res = await fetch(`/api/movements/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMovement(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!currentUser) { router.replace("/"); return; }
    fetchMovement();
  }, [currentUser, fetchMovement, router]);

  const isAdmin = currentUser?.role === "ADMIN";

  const handleAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionError("");
    const res = await fetch(`/api/movements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId: currentUser?.id, ...extra }),
    });
    const data = await res.json();
    if (res.ok) {
      fetchMovement();
      setVoidOpen(false);
      setCorrectOpen(false);
      setRejectOpen(false);
    } else {
      setActionError(data.error ?? "Error");
    }
  };

  if (loading || !movement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  const isNegative = ["EXPENSE", "OWNER_WITHDRAWAL"].includes(movement.type);
  const signedAmount = isNegative ? -movement.amount : movement.amount;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-8">
      <Header title="Detalle de movimiento" />

      <main className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Card principal */}
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-gray-400">{movement.code}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  <MovementTypeBadge type={movement.type} />
                  <MovementStatusBadge
                    status={movement.status}
                    approvalStatus={movement.approvalStatus}
                    withoutCashSession={movement.withoutCashSession}
                  />
                  {movement.withoutCashSession && (
                    <Badge color="purple">Sin caja abierta</Badge>
                  )}
                </div>
              </div>
              <span className={`text-2xl font-bold ${isNegative ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"} ${movement.status === "VOIDED" ? "line-through text-gray-400" : ""}`}>
                {isNegative ? "-" : "+"}{formatCurrency(movement.amount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Medio de pago</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {PAYMENT_METHOD_LABELS[movement.paymentMethod] ?? movement.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Registrado por</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{movement.createdBy.name}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Fecha y hora</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(movement.createdAt)}</p>
              </div>
              {movement.adjustmentDirection && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Dirección</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {movement.adjustmentDirection === "POSITIVE" ? "Sobrante (+)" : "Faltante (−)"}
                  </p>
                </div>
              )}
            </div>

            {movement.description && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Descripción</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{movement.description}</p>
              </div>
            )}

            {movement.correctionReason && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl px-3 py-2">
                <p className="text-xs text-orange-600 dark:text-orange-400">Motivo de corrección</p>
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-0.5">{movement.correctionReason}</p>
                {movement.originalAmount && (
                  <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                    Monto original: {formatCurrency(movement.originalAmount)}
                  </p>
                )}
              </div>
            )}

            {movement.voidReason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                <p className="text-xs text-red-600 dark:text-red-400">Motivo de anulación</p>
                <p className="text-sm text-red-800 dark:text-red-200 mt-0.5">{movement.voidReason}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Acciones — Solo admin */}
        {isAdmin && movement.status !== "VOIDED" && (
          <div className="flex flex-col gap-2">
            {movement.approvalStatus === "PENDING" && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="success" onClick={() => handleAction("approve")}>✓ Aprobar</Button>
                <Button variant="danger" onClick={() => {
                  setRejectStep("choose");
                  setRejectReason("");
                  setRejectAmount(String(movement.amount));
                  setRejectDescription(movement.description ?? "");
                  setRejectPaymentMethod(movement.paymentMethod);
                  setRejectAdjDirection("NEGATIVE");
                  setRejectOpen(true);
                }}>✗ Rechazar</Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => {
                setCorrectAmount(String(movement.amount));
                setCorrectDescription(movement.description ?? "");
                setCorrectReason("");
                setCorrectPaymentMethod(movement.paymentMethod);
                setCorrectOpen(true);
              }}>
                ✏️ Corregir
              </Button>
              <Button variant="danger" onClick={() => { setVoidReason(""); setVoidOpen(true); }}>
                🗑 Anular
              </Button>
            </div>
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
          </div>
        )}

        {/* Auditoría */}
        {movement.auditLogs.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Historial de cambios</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              {movement.auditLogs.map((log) => (
                <div key={log.id} className="text-sm border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{log.action}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Por: {log.performedBy.name}</p>
                  {log.reason && <p className="text-gray-600 dark:text-gray-300 mt-0.5 italic">"{log.reason}"</p>}
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        <Button variant="secondary" onClick={() => router.back()}>← Volver</Button>
      </main>

      {/* Modal anular */}
      {voidOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setVoidOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Anular movimiento</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Esta acción no se puede deshacer. El movimiento quedará marcado como anulado y no impactará en el saldo.
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Motivo * (obligatorio)</label>
                <input type="text" placeholder="Ej: Movimiento duplicado" value={voidReason} onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              {actionError && <p className="text-sm text-red-500">{actionError}</p>}
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setVoidOpen(false)}>Cancelar</Button>
                <Button variant="danger" className="flex-1" loading={voidLoading}
                  onClick={async () => { setVoidLoading(true); await handleAction("void", { reason: voidReason }); setVoidLoading(false); }}
                  disabled={!voidReason.trim()}>
                  Anular
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal corregir */}
      {correctOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCorrectOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Corregir movimiento</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Monto corregido</label>
                <input type="number" min="0.01" step="0.01" value={correctAmount} onChange={(e) => setCorrectAmount(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Descripción</label>
                <input type="text" value={correctDescription} onChange={(e) => setCorrectDescription(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Medio de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                    <button key={key} type="button"
                      onClick={() => setCorrectPaymentMethod(key)}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium transition-all ${correctPaymentMethod === key ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Motivo * (obligatorio)</label>
                <input type="text" placeholder="Ej: Monto ingresado incorrectamente" value={correctReason} onChange={(e) => setCorrectReason(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {actionError && <p className="text-sm text-red-500">{actionError}</p>}
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setCorrectOpen(false)}>Cancelar</Button>
                <Button variant="primary" className="flex-1" loading={correctLoading}
                  onClick={async () => { setCorrectLoading(true); await handleAction("correct", { amount: correctAmount, description: correctDescription, reason: correctReason, paymentMethod: correctPaymentMethod }); setCorrectLoading(false); }}
                  disabled={!correctReason.trim()}>
                  Guardar corrección
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal rechazar — 3 opciones */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            {rejectStep === "choose" && (
              <>
                <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">Rechazar egreso</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">¿Qué querés hacer con este egreso?</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setRejectStep("void")}
                    className="w-full text-left rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-4 hover:border-red-400 transition-all">
                    <p className="font-semibold text-red-700 dark:text-red-400">A) Anular</p>
                    <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">El movimiento queda anulado y no impacta en el saldo.</p>
                  </button>
                  <button onClick={() => setRejectStep("correct")}
                    className="w-full text-left rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-4 py-4 hover:border-orange-400 transition-all">
                    <p className="font-semibold text-orange-700 dark:text-orange-400">B) Corregir y aprobar</p>
                    <p className="text-sm text-orange-600 dark:text-orange-500 mt-0.5">Ajustá monto, descripción o medio de pago, y aprobá el movimiento corregido.</p>
                  </button>
                  <button onClick={() => setRejectStep("adjust")}
                    className="w-full text-left rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-4 hover:border-blue-400 transition-all">
                    <p className="font-semibold text-blue-700 dark:text-blue-400">C) Convertir en ajuste de caja</p>
                    <p className="text-sm text-blue-600 dark:text-blue-500 mt-0.5">Anula el egreso y crea un ajuste de caja con el mismo importe.</p>
                  </button>
                  <Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                </div>
              </>
            )}

            {rejectStep === "void" && (
              <>
                <button onClick={() => setRejectStep("choose")} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3">← Volver</button>
                <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Anular egreso</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Motivo (opcional)</label>
                    <input type="text" placeholder="Ej: No autorizado" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  {actionError && <p className="text-sm text-red-500">{actionError}</p>}
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                    <Button variant="danger" className="flex-1" loading={rejectLoading}
                      onClick={async () => { setRejectLoading(true); await handleAction("reject", { reason: rejectReason, approvalStatus: "void" }); setRejectLoading(false); }}>
                      Rechazar y anular
                    </Button>
                  </div>
                </div>
              </>
            )}

            {rejectStep === "correct" && (
              <>
                <button onClick={() => setRejectStep("choose")} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3">← Volver</button>
                <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Corregir y aprobar</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Monto corregido</label>
                    <input type="number" min="0.01" step="0.01" value={rejectAmount} onChange={(e) => setRejectAmount(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Descripción</label>
                    <input type="text" value={rejectDescription} onChange={(e) => setRejectDescription(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Medio de pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                        <button key={key} type="button"
                          onClick={() => setRejectPaymentMethod(key)}
                          className={`rounded-xl border px-2 py-2 text-xs font-medium transition-all ${rejectPaymentMethod === key ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Motivo * (obligatorio)</label>
                    <input type="text" placeholder="Ej: Monto incorrecto" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {actionError && <p className="text-sm text-red-500">{actionError}</p>}
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                    <Button variant="primary" className="flex-1" loading={rejectLoading}
                      onClick={async () => { setRejectLoading(true); await handleAction("reject-and-correct", { amount: rejectAmount, description: rejectDescription, paymentMethod: rejectPaymentMethod, reason: rejectReason }); setRejectLoading(false); }}
                      disabled={!rejectReason.trim()}>
                      Corregir y aprobar
                    </Button>
                  </div>
                </div>
              </>
            )}

            {rejectStep === "adjust" && (
              <>
                <button onClick={() => setRejectStep("choose")} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3">← Volver</button>
                <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Convertir en ajuste de caja</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Dirección del ajuste</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setRejectAdjDirection("NEGATIVE")}
                        className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all ${rejectAdjDirection === "NEGATIVE" ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-red-400"}`}>
                        Faltante (−)
                      </button>
                      <button type="button" onClick={() => setRejectAdjDirection("POSITIVE")}
                        className={`rounded-xl border px-3 py-3 text-sm font-medium transition-all ${rejectAdjDirection === "POSITIVE" ? "bg-green-600 text-white border-green-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-400"}`}>
                        Sobrante (+)
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Monto del ajuste</label>
                    <input type="number" min="0.01" step="0.01" value={rejectAmount} onChange={(e) => setRejectAmount(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Descripción del ajuste (opcional)</label>
                    <input type="text" value={rejectDescription} onChange={(e) => setRejectDescription(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Motivo del rechazo * (obligatorio)</label>
                    <input type="text" placeholder="Ej: No autorizado, se ajusta diferencia" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {actionError && <p className="text-sm text-red-500">{actionError}</p>}
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setRejectOpen(false)}>Cancelar</Button>
                    <Button variant="primary" className="flex-1" loading={rejectLoading}
                      onClick={async () => { setRejectLoading(true); await handleAction("reject-and-adjust", { amount: rejectAmount, description: rejectDescription, adjustmentDirection: rejectAdjDirection, reason: rejectReason }); setRejectLoading(false); }}
                      disabled={!rejectReason.trim()}>
                      Anular y crear ajuste
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
