import { Badge } from "@/components/ui/badge";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_STATUS_LABELS,
  APPROVAL_STATUS_LABELS,
} from "@/lib/format";

type MovementStatus = "ACTIVE" | "CORRECTED" | "VOIDED";
type ApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

export function MovementStatusBadge({
  status,
  approvalStatus,
  withoutCashSession,
}: {
  status: MovementStatus;
  approvalStatus: ApprovalStatus;
  withoutCashSession?: boolean;
}) {
  if (status === "VOIDED") {
    return <Badge color="red">Anulado</Badge>;
  }
  if (status === "CORRECTED") {
    return <Badge color="orange">Corregido</Badge>;
  }
  if (approvalStatus === "PENDING") {
    return <Badge color="yellow">Pendiente</Badge>;
  }
  if (approvalStatus === "REJECTED") {
    return <Badge color="red">Rechazado</Badge>;
  }
  if (approvalStatus === "APPROVED") {
    return <Badge color="green">Aprobado</Badge>;
  }
  if (withoutCashSession) {
    return <Badge color="purple">Sin caja</Badge>;
  }
  return <Badge color="green">Activo</Badge>;
}

export function MovementTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, "blue" | "red" | "orange" | "purple" | "green" | "gray"> = {
    SALE: "blue",
    EXPENSE: "red",
    OWNER_WITHDRAWAL: "orange",
    OWNER_CONTRIBUTION: "green",
    CASH_ADJUSTMENT: "purple",
  };
  return (
    <Badge color={colorMap[type] ?? "gray"}>
      {MOVEMENT_TYPE_LABELS[type] ?? type}
    </Badge>
  );
}
