export function formatCurrency(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
  MERCADO_PAGO: "Mercado Pago",
  OTHER: "Otro",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  SALE: "Venta",
  EXPENSE: "Egreso",
  OWNER_WITHDRAWAL: "Retiro dueña",
  OWNER_CONTRIBUTION: "Aporte dueña",
  CASH_ADJUSTMENT: "Ajuste de caja",
};

export const MOVEMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  CORRECTED: "Corregido",
  VOIDED: "Anulado",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  NOT_REQUIRED: "",
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Dueña / Admin",
  EMPLOYEE: "Empleado",
};
