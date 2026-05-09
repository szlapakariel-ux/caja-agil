"use client";

import { formatCurrency, formatTime, PAYMENT_METHOD_LABELS } from "@/lib/format";
import { MovementStatusBadge, MovementTypeBadge } from "./movement-badge";
import { cn } from "@/lib/utils";

type Movement = {
  id: string;
  code: string;
  type: string;
  amount: number | string | { toNumber(): number };
  paymentMethod: string;
  status: "ACTIVE" | "CORRECTED" | "VOIDED";
  approvalStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  withoutCashSession: boolean;
  createdAt: string | Date;
  createdBy?: { name: string };
  description?: string | null;
};

function getAmount(amount: number | string | { toNumber(): number }): number {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") return parseFloat(amount);
  return amount.toNumber();
}

export function MovementCard({
  movement,
  onClick,
}: {
  movement: Movement;
  onClick?: () => void;
}) {
  const amount = getAmount(movement.amount);
  const isNegative = ["EXPENSE", "OWNER_WITHDRAWAL"].includes(movement.type) ||
    (movement.type === "CASH_ADJUSTMENT" && false);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors",
        onClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
        movement.status === "VOIDED" && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-mono">{movement.code}</span>
          <MovementTypeBadge type={movement.type} />
          <MovementStatusBadge
            status={movement.status}
            approvalStatus={movement.approvalStatus}
            withoutCashSession={movement.withoutCashSession}
          />
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{PAYMENT_METHOD_LABELS[movement.paymentMethod] ?? movement.paymentMethod}</span>
          {movement.createdBy && <span>· {movement.createdBy.name}</span>}
          <span>· {formatTime(movement.createdAt)}</span>
        </div>
        {movement.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {movement.description}
          </p>
        )}
      </div>
      <div
        className={cn(
          "font-bold text-base whitespace-nowrap",
          isNegative ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
          movement.status === "VOIDED" && "line-through text-gray-400"
        )}
      >
        {isNegative ? "-" : "+"}{formatCurrency(amount)}
      </div>
    </div>
  );
}
