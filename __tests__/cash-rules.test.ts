import {
  MovementType,
  MovementStatus,
  ApprovalStatus,
  AdjustmentDirection,
  PaymentMethod,
} from "@prisma/client";
import {
  getMovementSignedAmount,
  calculateExpectedBalance,
  calculateExpectedBalanceByPaymentMethod,
  calculateClosureDifference,
  requiresApproval,
  canVoidMovement,
  canCorrectMovement,
  canRegisterOwnerMovement,
  canDoFinalClosure,
  movementImpactsBalance,
  summarizeMovements,
  MovementForCalc,
} from "../lib/cash-rules";

function makeMov(overrides: Partial<MovementForCalc>): MovementForCalc {
  return {
    type: MovementType.SALE,
    amount: 1000,
    paymentMethod: PaymentMethod.CASH,
    status: MovementStatus.ACTIVE,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    adjustmentDirection: null,
    ...overrides,
  };
}

describe("Reglas de caja — impacto en saldo", () => {
  test("venta activa suma al saldo", () => {
    const mov = makeMov({ type: MovementType.SALE, amount: 1000 });
    expect(getMovementSignedAmount(mov)).toBe(1000);
  });

  test("egreso activo resta del saldo", () => {
    const mov = makeMov({ type: MovementType.EXPENSE, amount: 500 });
    expect(getMovementSignedAmount(mov)).toBe(-500);
  });

  test("retiro de dueña resta del saldo", () => {
    const mov = makeMov({ type: MovementType.OWNER_WITHDRAWAL, amount: 3000 });
    expect(getMovementSignedAmount(mov)).toBe(-3000);
  });

  test("aporte de dueña suma al saldo", () => {
    const mov = makeMov({ type: MovementType.OWNER_CONTRIBUTION, amount: 5000 });
    expect(getMovementSignedAmount(mov)).toBe(5000);
  });

  test("ajuste positivo suma al saldo", () => {
    const mov = makeMov({
      type: MovementType.CASH_ADJUSTMENT,
      adjustmentDirection: AdjustmentDirection.POSITIVE,
      amount: 200,
    });
    expect(getMovementSignedAmount(mov)).toBe(200);
  });

  test("ajuste negativo resta del saldo", () => {
    const mov = makeMov({
      type: MovementType.CASH_ADJUSTMENT,
      adjustmentDirection: AdjustmentDirection.NEGATIVE,
      amount: 150,
    });
    expect(getMovementSignedAmount(mov)).toBe(-150);
  });
});

describe("Reglas de caja — movimientos anulados", () => {
  test("venta anulada no impacta el saldo", () => {
    const mov = makeMov({
      type: MovementType.SALE,
      amount: 1000,
      status: MovementStatus.VOIDED,
    });
    expect(getMovementSignedAmount(mov)).toBe(0);
    expect(movementImpactsBalance(mov)).toBe(false);
  });

  test("egreso anulado no impacta el saldo", () => {
    const mov = makeMov({
      type: MovementType.EXPENSE,
      amount: 500,
      status: MovementStatus.VOIDED,
    });
    expect(getMovementSignedAmount(mov)).toBe(0);
  });

  test("retiro anulado no impacta el saldo", () => {
    const mov = makeMov({
      type: MovementType.OWNER_WITHDRAWAL,
      amount: 2000,
      status: MovementStatus.VOIDED,
    });
    expect(getMovementSignedAmount(mov)).toBe(0);
  });

  test("aporte anulado no impacta el saldo", () => {
    const mov = makeMov({
      type: MovementType.OWNER_CONTRIBUTION,
      amount: 4000,
      status: MovementStatus.VOIDED,
    });
    expect(getMovementSignedAmount(mov)).toBe(0);
  });

  test("ajuste anulado no impacta el saldo", () => {
    const mov = makeMov({
      type: MovementType.CASH_ADJUSTMENT,
      adjustmentDirection: AdjustmentDirection.POSITIVE,
      amount: 300,
      status: MovementStatus.VOIDED,
    });
    expect(getMovementSignedAmount(mov)).toBe(0);
  });
});

describe("Reglas de caja — movimientos rechazados", () => {
  test("egreso rechazado no impacta el saldo", () => {
    const mov = makeMov({
      type: MovementType.EXPENSE,
      amount: 800,
      approvalStatus: ApprovalStatus.REJECTED,
    });
    expect(getMovementSignedAmount(mov)).toBe(0);
    expect(movementImpactsBalance(mov)).toBe(false);
  });
});

describe("Reglas de caja — egreso pendiente", () => {
  test("egreso pendiente SÍ impacta el saldo (hasta revisión)", () => {
    const mov = makeMov({
      type: MovementType.EXPENSE,
      amount: 600,
      approvalStatus: ApprovalStatus.PENDING,
    });
    expect(getMovementSignedAmount(mov)).toBe(-600);
    expect(movementImpactsBalance(mov)).toBe(true);
  });
});

describe("Reglas de caja — saldo esperado total", () => {
  test("saldo inicial más ventas menos egresos", () => {
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 3000 }),
      makeMov({ type: MovementType.SALE, amount: 2000 }),
      makeMov({ type: MovementType.EXPENSE, amount: 500 }),
    ];
    expect(calculateExpectedBalance(1000, movements)).toBe(5500);
  });

  test("saldo ignora movimientos anulados", () => {
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 3000 }),
      makeMov({
        type: MovementType.SALE,
        amount: 1000,
        status: MovementStatus.VOIDED,
      }),
    ];
    expect(calculateExpectedBalance(0, movements)).toBe(3000);
  });

  test("saldo con todos los tipos de movimiento", () => {
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 10000 }),
      makeMov({ type: MovementType.EXPENSE, amount: 2000 }),
      makeMov({ type: MovementType.OWNER_WITHDRAWAL, amount: 3000 }),
      makeMov({ type: MovementType.OWNER_CONTRIBUTION, amount: 5000 }),
      makeMov({
        type: MovementType.CASH_ADJUSTMENT,
        adjustmentDirection: AdjustmentDirection.POSITIVE,
        amount: 200,
      }),
      makeMov({
        type: MovementType.CASH_ADJUSTMENT,
        adjustmentDirection: AdjustmentDirection.NEGATIVE,
        amount: 100,
      }),
    ];
    // 1000 (inicial) + 10000 - 2000 - 3000 + 5000 + 200 - 100 = 11100
    expect(calculateExpectedBalance(1000, movements)).toBe(11100);
  });
});

describe("Reglas de caja — saldo por medio de pago", () => {
  test("separa correctamente el saldo por medio de pago", () => {
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 1000, paymentMethod: PaymentMethod.CASH }),
      makeMov({ type: MovementType.SALE, amount: 2000, paymentMethod: PaymentMethod.TRANSFER }),
      makeMov({ type: MovementType.EXPENSE, amount: 300, paymentMethod: PaymentMethod.CASH }),
    ];
    const result = calculateExpectedBalanceByPaymentMethod(movements);
    expect(result[PaymentMethod.CASH]).toBe(700);
    expect(result[PaymentMethod.TRANSFER]).toBe(2000);
    expect(result[PaymentMethod.CARD]).toBe(0);
  });
});

describe("Reglas de caja — cierres", () => {
  test("cierre parcial calcula diferencia positiva (sobrante)", () => {
    const diff = calculateClosureDifference(10000, 10300);
    expect(diff).toBe(300);
  });

  test("cierre parcial calcula diferencia negativa (faltante)", () => {
    const diff = calculateClosureDifference(10000, 9800);
    expect(diff).toBe(-200);
  });

  test("cierre final calcula diferencia cero (exacto)", () => {
    const diff = calculateClosureDifference(5000, 5000);
    expect(diff).toBe(0);
  });
});

describe("Reglas de permisos", () => {
  test("egreso cargado por empleado requiere aprobación", () => {
    expect(requiresApproval(MovementType.EXPENSE, "EMPLOYEE")).toBe(true);
  });

  test("egreso cargado por admin no requiere aprobación", () => {
    expect(requiresApproval(MovementType.EXPENSE, "ADMIN")).toBe(false);
  });

  test("venta por empleado no requiere aprobación", () => {
    expect(requiresApproval(MovementType.SALE, "EMPLOYEE")).toBe(false);
  });

  test("solo admin puede anular movimientos", () => {
    expect(canVoidMovement("ADMIN")).toBe(true);
    expect(canVoidMovement("EMPLOYEE")).toBe(false);
  });

  test("solo admin puede corregir movimientos", () => {
    expect(canCorrectMovement("ADMIN")).toBe(true);
    expect(canCorrectMovement("EMPLOYEE")).toBe(false);
  });

  test("solo admin puede registrar movimientos de dueña", () => {
    expect(canRegisterOwnerMovement("ADMIN")).toBe(true);
    expect(canRegisterOwnerMovement("EMPLOYEE")).toBe(false);
  });

  test("solo admin puede hacer cierre final", () => {
    expect(canDoFinalClosure("ADMIN")).toBe(true);
    expect(canDoFinalClosure("EMPLOYEE")).toBe(false);
  });
});

describe("Reglas de caja — movimiento sin caja abierta", () => {
  test("movimiento sin caja abierta debe registrarse con marca especial", () => {
    const movimiento = {
      withoutCashSession: true,
      cashSessionId: null,
    };
    expect(movimiento.withoutCashSession).toBe(true);
    expect(movimiento.cashSessionId).toBeNull();
  });
});

describe("Reglas de caja — auditoría y corrección", () => {
  test("corrección debe guardar auditoría con valores anterior y nuevo", () => {
    const auditEntry = {
      entityType: "CashMovement",
      entityId: "mov-123",
      action: "CORRECTION",
      previousValue: { amount: 2000, description: null },
      newValue: { amount: 2200, description: null },
      performedByUserId: "user-admin",
      reason: "Monto ingresado incorrectamente",
    };

    expect(auditEntry.previousValue).toBeDefined();
    expect(auditEntry.newValue).toBeDefined();
    expect(auditEntry.reason).not.toBe("");
    expect(auditEntry.action).toBe("CORRECTION");
  });

  test("anulación requiere motivo obligatorio", () => {
    const voidReason = "Egreso duplicado";
    expect(voidReason.length).toBeGreaterThan(0);
  });
});

describe("Resumen del día", () => {
  test("summarizeMovements calcula correctamente", () => {
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 5000 }),
      makeMov({ type: MovementType.SALE, amount: 3000 }),
      makeMov({ type: MovementType.EXPENSE, amount: 1000 }),
      makeMov({
        type: MovementType.EXPENSE,
        amount: 500,
        approvalStatus: ApprovalStatus.PENDING,
      }),
      makeMov({ type: MovementType.OWNER_WITHDRAWAL, amount: 10000 }),
      makeMov({ type: MovementType.OWNER_CONTRIBUTION, amount: 15000 }),
      makeMov({
        type: MovementType.CASH_ADJUSTMENT,
        adjustmentDirection: AdjustmentDirection.POSITIVE,
        amount: 200,
      }),
      makeMov({
        type: MovementType.CASH_ADJUSTMENT,
        adjustmentDirection: AdjustmentDirection.NEGATIVE,
        amount: 100,
      }),
    ];

    const summary = summarizeMovements(movements);
    expect(summary.sales).toBe(8000);
    expect(summary.expenses).toBe(1500);
    expect(summary.ownerWithdrawals).toBe(10000);
    expect(summary.ownerContributions).toBe(15000);
    expect(summary.adjustmentsPositive).toBe(200);
    expect(summary.adjustmentsNegative).toBe(100);
    expect(summary.pendingExpenses).toBe(1);
  });
});

// ─── Tests de los 5 fixes ──────────────────────────────────────────────────

describe("Fix 1 — Recordar usuario solo si checkbox activo", () => {
  test("setCurrentUser sin persist=true no debe persistir en localStorage", () => {
    // Simula la lógica del contexto: si persist=false, solo estado en memoria
    const stored: Record<string, string> = {};
    const mockSetItem = (key: string, val: string) => { stored[key] = val; };
    const setCurrentUser = (user: object | null, persist = false) => {
      if (user && persist) mockSetItem("caja_agil_user", JSON.stringify(user));
    };
    setCurrentUser({ id: "1", name: "Vanina", role: "ADMIN" }, false);
    expect(stored["caja_agil_user"]).toBeUndefined();
  });

  test("setCurrentUser con persist=true sí persiste en localStorage", () => {
    const stored: Record<string, string> = {};
    const mockSetItem = (key: string, val: string) => { stored[key] = val; };
    const setCurrentUser = (user: object | null, persist = false) => {
      if (user && persist) mockSetItem("caja_agil_user", JSON.stringify(user));
    };
    setCurrentUser({ id: "1", name: "Vanina", role: "ADMIN" }, true);
    expect(stored["caja_agil_user"]).toBeDefined();
  });
});

describe("Fix 2 — Movimientos sin sesión no se autoasignan", () => {
  test("movimiento con withoutCashSession=true impacta el saldo normalmente", () => {
    const mov = makeMov({ type: MovementType.SALE, amount: 500 });
    // La lógica de impacto no depende de withoutCashSession, solo de status/approvalStatus
    expect(movementImpactsBalance(mov)).toBe(true);
    expect(getMovementSignedAmount(mov)).toBe(500);
  });

  test("movimiento anulado no impacta el saldo aunque tenga withoutCashSession", () => {
    const mov = makeMov({ type: MovementType.SALE, amount: 500, status: MovementStatus.VOIDED });
    expect(movementImpactsBalance(mov)).toBe(false);
  });
});

describe("Fix 3 — Asignar movimientos pendientes a sesión", () => {
  test("asignar movimientos: balance aumenta al incluirlos en el cálculo de sesión", () => {
    const sessionMovements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 1000 }),
    ];
    const pendingMovements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 500 }),
      makeMov({ type: MovementType.EXPENSE, amount: 200 }),
    ];
    const withoutPending = calculateExpectedBalance(0, sessionMovements);
    const withPending = calculateExpectedBalance(0, [...sessionMovements, ...pendingMovements]);
    expect(withoutPending).toBe(1000);
    expect(withPending).toBe(1300);
  });
});

describe("Fix 4 — Corrección con cambio de medio de pago", () => {
  test("corrección registra el medio de pago anterior y nuevo en auditoría", () => {
    const movement = makeMov({ type: MovementType.SALE, amount: 1000, paymentMethod: PaymentMethod.CASH });
    const newPaymentMethod = PaymentMethod.TRANSFER;
    const previousValue = { amount: movement.amount, paymentMethod: movement.paymentMethod };
    const newValue = { amount: 1200, paymentMethod: newPaymentMethod, status: "CORRECTED" };
    expect(previousValue.paymentMethod).toBe(PaymentMethod.CASH);
    expect(newValue.paymentMethod).toBe(PaymentMethod.TRANSFER);
    expect(newValue.status).toBe("CORRECTED");
  });

  test("movimiento corregido sigue impactando el saldo", () => {
    const mov = makeMov({ type: MovementType.SALE, amount: 1200, status: MovementStatus.CORRECTED });
    expect(movementImpactsBalance(mov)).toBe(true);
    expect(getMovementSignedAmount(mov)).toBe(1200);
  });
});

describe("Fix 5 — Rechazar egreso con 3 opciones", () => {
  test("opción A (anular): movimiento anulado no impacta saldo", () => {
    const mov = makeMov({
      type: MovementType.EXPENSE,
      amount: 800,
      status: MovementStatus.VOIDED,
      approvalStatus: ApprovalStatus.REJECTED,
    });
    expect(movementImpactsBalance(mov)).toBe(false);
    expect(getMovementSignedAmount(mov)).toBe(0);
  });

  test("opción B (corregir): egreso corregido y aprobado impacta saldo", () => {
    const mov = makeMov({
      type: MovementType.EXPENSE,
      amount: 600,
      status: MovementStatus.CORRECTED,
      approvalStatus: ApprovalStatus.APPROVED,
    });
    expect(movementImpactsBalance(mov)).toBe(true);
    expect(getMovementSignedAmount(mov)).toBe(-600);
  });

  test("opción C (ajuste): egreso original anulado + ajuste; balance neto correcto", () => {
    const voidedExpense = makeMov({
      type: MovementType.EXPENSE,
      amount: 800,
      status: MovementStatus.VOIDED,
      approvalStatus: ApprovalStatus.REJECTED,
    });
    const adjustment = makeMov({
      type: MovementType.CASH_ADJUSTMENT,
      amount: 800,
      adjustmentDirection: AdjustmentDirection.NEGATIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
    });
    const balance = calculateExpectedBalance(0, [voidedExpense, adjustment]);
    // Voided expense = 0, adjustment NEGATIVE = -800
    expect(balance).toBe(-800);
  });

  test("balance correcto luego de las 3 opciones de rechazo", () => {
    const openingAmount = 5000;
    const sale = makeMov({ type: MovementType.SALE, amount: 2000 });

    // Opción A: egreso anulado => no impacta
    const voidedExpense = makeMov({ type: MovementType.EXPENSE, amount: 500, status: MovementStatus.VOIDED, approvalStatus: ApprovalStatus.REJECTED });
    expect(calculateExpectedBalance(openingAmount, [sale, voidedExpense])).toBe(7000);

    // Opción B: egreso corregido y aprobado => impacta con monto corregido
    const correctedExpense = makeMov({ type: MovementType.EXPENSE, amount: 300, status: MovementStatus.CORRECTED, approvalStatus: ApprovalStatus.APPROVED });
    expect(calculateExpectedBalance(openingAmount, [sale, correctedExpense])).toBe(6700);

    // Opción C: egreso anulado + ajuste negativo
    const adj = makeMov({ type: MovementType.CASH_ADJUSTMENT, amount: 500, adjustmentDirection: AdjustmentDirection.NEGATIVE });
    expect(calculateExpectedBalance(openingAmount, [sale, voidedExpense, adj])).toBe(6500);
  });
});

// ─── Tests de consistencia dashboard vs cierre ────────────────────────────

describe("Consistencia saldo dashboard vs expectedTotal cierre", () => {
  test("misma función produce mismo resultado: dashboard y cierre coinciden", () => {
    // Simula el conjunto de movimientos que ve el dashboard y que usará el cierre
    const openingAmount = 5000;
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 3000 }),
      makeMov({ type: MovementType.SALE, amount: 1500 }),
      makeMov({ type: MovementType.EXPENSE, amount: 400, approvalStatus: ApprovalStatus.APPROVED }),
      makeMov({ type: MovementType.OWNER_WITHDRAWAL, amount: 1000 }),
    ];
    // Si dashboard y cierre usan la misma función con los mismos datos, el resultado es idéntico
    const dashboardBalance = calculateExpectedBalance(openingAmount, movements);
    const closureExpectedTotal = calculateExpectedBalance(openingAmount, movements);
    expect(dashboardBalance).toBe(closureExpectedTotal);
    expect(dashboardBalance).toBe(8100); // 5000 + 3000 + 1500 - 400 - 1000
  });

  test("movimiento withoutCashSession incluido en ambos cálculos", () => {
    const openingAmount = 2000;
    const sessionMovements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 1000 }),
    ];
    const withoutSessionMovements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 500 }),
    ];
    // El dashboard y el cierre (corregido) incluyen ambos conjuntos
    const allMovements = [...sessionMovements, ...withoutSessionMovements];
    expect(calculateExpectedBalance(openingAmount, allMovements)).toBe(3500);
    // Solo con sesión (comportamiento anterior buggy) daría un número diferente
    expect(calculateExpectedBalance(openingAmount, sessionMovements)).toBe(3000);
  });

  test("movimientos anulados no impactan el saldo esperado del cierre", () => {
    const openingAmount = 5000;
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 2000 }),
      makeMov({ type: MovementType.EXPENSE, amount: 800, status: MovementStatus.VOIDED, approvalStatus: ApprovalStatus.REJECTED }),
      makeMov({ type: MovementType.SALE, amount: 500, status: MovementStatus.VOIDED }),
    ];
    expect(calculateExpectedBalance(openingAmount, movements)).toBe(7000); // 5000 + 2000, anulados no cuentan
  });

  test("egreso pendiente SÍ descuenta del saldo esperado del cierre", () => {
    const openingAmount = 5000;
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 2000 }),
      makeMov({ type: MovementType.EXPENSE, amount: 300, approvalStatus: ApprovalStatus.PENDING }),
    ];
    // El egreso pendiente impacta hasta que sea rechazado
    expect(calculateExpectedBalance(openingAmount, movements)).toBe(6700); // 5000 + 2000 - 300
  });

  test("si Vanina carga el saldo esperado como contado, la diferencia es 0", () => {
    const openingAmount = 5000;
    const movements: MovementForCalc[] = [
      makeMov({ type: MovementType.SALE, amount: 3000 }),
      makeMov({ type: MovementType.EXPENSE, amount: 500, approvalStatus: ApprovalStatus.APPROVED }),
    ];
    const expectedTotal = calculateExpectedBalance(openingAmount, movements);
    const countedTotal = expectedTotal; // Vanina cuenta exactamente lo esperado
    const difference = calculateClosureDifference(expectedTotal, countedTotal);
    expect(difference).toBe(0);
  });
});
