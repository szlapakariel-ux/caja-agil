import {
  MovementType,
  MovementStatus,
  ApprovalStatus,
  AdjustmentDirection,
  PaymentMethod,
} from "@prisma/client";

export type MovementForCalc = {
  type: MovementType;
  adjustmentDirection?: AdjustmentDirection | null;
  amount: number | string | { toNumber(): number };
  status: MovementStatus;
  approvalStatus: ApprovalStatus;
  paymentMethod: PaymentMethod;
};

function toNumber(val: number | string | { toNumber(): number }): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val);
  return val.toNumber();
}

export function movementImpactsBalance(movement: MovementForCalc): boolean {
  if (movement.status === MovementStatus.VOIDED) return false;
  if (movement.approvalStatus === ApprovalStatus.REJECTED) return false;
  return true;
}

export function getMovementSignedAmount(movement: MovementForCalc): number {
  if (!movementImpactsBalance(movement)) return 0;

  const amount = toNumber(movement.amount);

  switch (movement.type) {
    case MovementType.SALE:
      return amount;
    case MovementType.EXPENSE:
      return -amount;
    case MovementType.OWNER_WITHDRAWAL:
      return -amount;
    case MovementType.OWNER_CONTRIBUTION:
      return amount;
    case MovementType.CASH_ADJUSTMENT:
      if (movement.adjustmentDirection === AdjustmentDirection.POSITIVE) {
        return amount;
      } else if (movement.adjustmentDirection === AdjustmentDirection.NEGATIVE) {
        return -amount;
      }
      return 0;
    default:
      return 0;
  }
}

export function calculateExpectedBalance(
  openingAmount: number,
  movements: MovementForCalc[]
): number {
  return movements.reduce(
    (acc, mov) => acc + getMovementSignedAmount(mov),
    openingAmount
  );
}

export function calculateExpectedBalanceByPaymentMethod(
  movements: MovementForCalc[]
): Record<PaymentMethod, number> {
  const result: Record<PaymentMethod, number> = {
    [PaymentMethod.CASH]: 0,
    [PaymentMethod.TRANSFER]: 0,
    [PaymentMethod.CARD]: 0,
    [PaymentMethod.MERCADO_PAGO]: 0,
    [PaymentMethod.OTHER]: 0,
  };

  for (const mov of movements) {
    const signed = getMovementSignedAmount(mov);
    result[mov.paymentMethod] += signed;
  }

  return result;
}

export function calculateClosureDifference(
  expectedTotal: number,
  countedTotal: number
): number {
  return countedTotal - expectedTotal;
}

export function requiresApproval(
  movementType: MovementType,
  userRole: string
): boolean {
  if (userRole === "ADMIN") return false;
  if (movementType === MovementType.EXPENSE) return true;
  return false;
}

export function canVoidMovement(userRole: string): boolean {
  return userRole === "ADMIN";
}

export function canCorrectMovement(userRole: string): boolean {
  return userRole === "ADMIN";
}

export function canRegisterOwnerMovement(userRole: string): boolean {
  return userRole === "ADMIN";
}

export function canRegisterCashAdjustment(userRole: string): boolean {
  return userRole === "ADMIN";
}

export function canDoFinalClosure(userRole: string): boolean {
  return userRole === "ADMIN";
}

export function summarizeMovements(movements: MovementForCalc[]) {
  const sales = movements
    .filter(
      (m) =>
        m.type === MovementType.SALE && movementImpactsBalance(m)
    )
    .reduce((acc, m) => acc + toNumber(m.amount), 0);

  const expenses = movements
    .filter(
      (m) =>
        m.type === MovementType.EXPENSE && movementImpactsBalance(m)
    )
    .reduce((acc, m) => acc + toNumber(m.amount), 0);

  const ownerWithdrawals = movements
    .filter(
      (m) =>
        m.type === MovementType.OWNER_WITHDRAWAL && movementImpactsBalance(m)
    )
    .reduce((acc, m) => acc + toNumber(m.amount), 0);

  const ownerContributions = movements
    .filter(
      (m) =>
        m.type === MovementType.OWNER_CONTRIBUTION && movementImpactsBalance(m)
    )
    .reduce((acc, m) => acc + toNumber(m.amount), 0);

  const adjustmentsPositive = movements
    .filter(
      (m) =>
        m.type === MovementType.CASH_ADJUSTMENT &&
        m.adjustmentDirection === AdjustmentDirection.POSITIVE &&
        movementImpactsBalance(m)
    )
    .reduce((acc, m) => acc + toNumber(m.amount), 0);

  const adjustmentsNegative = movements
    .filter(
      (m) =>
        m.type === MovementType.CASH_ADJUSTMENT &&
        m.adjustmentDirection === AdjustmentDirection.NEGATIVE &&
        movementImpactsBalance(m)
    )
    .reduce((acc, m) => acc + toNumber(m.amount), 0);

  const pendingExpenses = movements.filter(
    (m) =>
      m.type === MovementType.EXPENSE &&
      m.approvalStatus === ApprovalStatus.PENDING
  ).length;

  return {
    sales,
    expenses,
    ownerWithdrawals,
    ownerContributions,
    adjustmentsPositive,
    adjustmentsNegative,
    pendingExpenses,
  };
}
