import "dotenv/config";
import {
  PrismaClient,
  UserRole,
  PaymentMethod,
  MovementType,
  AdjustmentDirection,
  MovementStatus,
  ApprovalStatus,
  SessionStatus,
  ClosureType,
  ClosureStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function getNextCode(name: string, prefix: string): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { name },
    update: { current: { increment: 1 } },
    create: { name, current: 1 },
  });
  return `${prefix}-${String(counter.current).padStart(4, "0")}`;
}

async function main() {
  console.log("🌱 Iniciando seed de datos demo...");

  await prisma.auditLog.deleteMany();
  await prisma.cashClosure.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashSession.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.businessConfig.deleteMany();
  await prisma.user.deleteMany();

  const config = await prisma.businessConfig.create({
    data: {
      businessName: "Librería El Faro",
      appDisplayName: "Caja Simple MVP",
      currency: "ARS",
      activePaymentMethods: [
        PaymentMethod.CASH,
        PaymentMethod.TRANSFER,
        PaymentMethod.CARD,
        PaymentMethod.MERCADO_PAGO,
        PaymentMethod.OTHER,
      ],
      themePreference: "system",
    },
  });
  console.log("✅ Configuración del negocio creada:", config.businessName);

  const vanina = await prisma.user.create({
    data: {
      name: "Vanina",
      role: UserRole.ADMIN,
      pinDemo: "1234",
    },
  });

  const empleado1 = await prisma.user.create({
    data: {
      name: "Male",
      role: UserRole.EMPLOYEE,
      avatarIcon: "male",
      avatarColor: "white",
    },
  });

  const empleado2 = await prisma.user.create({
    data: {
      name: "Ariel",
      role: UserRole.EMPLOYEE,
      avatarColor: "green",
    },
  });

  await prisma.user.create({
    data: {
      name: "Maty",
      role: UserRole.EMPLOYEE,
      avatarColor: "brown",
    },
  });

  console.log("✅ Usuarios creados: Vanina, Male, Ariel, Maty");

  const mov1Code = await getNextCode("movement", "MOV");
  const mov2Code = await getNextCode("movement", "MOV");

  await prisma.cashMovement.createMany({
    data: [
      {
        code: mov1Code,
        cashSessionId: null,
        withoutCashSession: true,
        type: MovementType.SALE,
        amount: 1500,
        paymentMethod: PaymentMethod.CASH,
        status: MovementStatus.ACTIVE,
        approvalStatus: ApprovalStatus.NOT_REQUIRED,
        createdByUserId: empleado1.id,
      },
      {
        code: mov2Code,
        cashSessionId: null,
        withoutCashSession: true,
        type: MovementType.SALE,
        amount: 2800,
        paymentMethod: PaymentMethod.MERCADO_PAGO,
        status: MovementStatus.ACTIVE,
        approvalStatus: ApprovalStatus.NOT_REQUIRED,
        createdByUserId: empleado2.id,
      },
    ],
  });
  console.log("✅ Movimientos sin caja creados (2)");

  const sessionCode = await getNextCode("session", "CAJA");
  const session = await prisma.cashSession.create({
    data: {
      code: sessionCode,
      openingAmount: 5000,
      status: SessionStatus.OPEN,
      openedByUserId: vanina.id,
      openedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
  });
  console.log("✅ Caja abierta:", session.code);

  const movements = [
    {
      type: MovementType.SALE,
      amount: 3500,
      paymentMethod: PaymentMethod.CASH,
      description: null,
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: vanina.id,
      createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    },
    {
      type: MovementType.SALE,
      amount: 1200,
      paymentMethod: PaymentMethod.TRANSFER,
      description: null,
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: empleado1.id,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      type: MovementType.SALE,
      amount: 4500,
      paymentMethod: PaymentMethod.CARD,
      description: null,
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: empleado1.id,
      createdAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000),
    },
    {
      type: MovementType.EXPENSE,
      amount: 800,
      paymentMethod: PaymentMethod.CASH,
      description: "Compra de bolsas para el local",
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.PENDING,
      createdByUserId: empleado1.id,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      type: MovementType.EXPENSE,
      amount: 2500,
      paymentMethod: PaymentMethod.TRANSFER,
      description: "Pago internet del mes",
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.APPROVED,
      approvedByUserId: vanina.id,
      createdByUserId: empleado2.id,
      createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000),
    },
    {
      type: MovementType.SALE,
      amount: 6000,
      paymentMethod: PaymentMethod.MERCADO_PAGO,
      description: null,
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: vanina.id,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      type: MovementType.OWNER_WITHDRAWAL,
      amount: 15000,
      paymentMethod: PaymentMethod.CASH,
      description: "Retiro semanal",
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: vanina.id,
      createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
    },
    {
      type: MovementType.OWNER_CONTRIBUTION,
      amount: 20000,
      paymentMethod: PaymentMethod.CASH,
      description: "Aporte para compra de mercadería",
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: vanina.id,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      type: MovementType.SALE,
      amount: 950,
      paymentMethod: PaymentMethod.CASH,
      description: null,
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: empleado2.id,
      createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
    },
    {
      type: MovementType.CASH_ADJUSTMENT,
      amount: 300,
      paymentMethod: PaymentMethod.CASH,
      description: "Sobrante detectado en conteo",
      adjustmentDirection: AdjustmentDirection.POSITIVE,
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: vanina.id,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      type: MovementType.SALE,
      amount: 2200,
      paymentMethod: PaymentMethod.CARD,
      description: null,
      status: MovementStatus.CORRECTED,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      correctionReason: "Se corrigió el monto ingresado incorrectamente",
      originalAmount: 2000,
      createdByUserId: empleado1.id,
      createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    },
    {
      type: MovementType.EXPENSE,
      amount: 1500,
      paymentMethod: PaymentMethod.CASH,
      description: "Pago de limpieza",
      status: MovementStatus.VOIDED,
      approvalStatus: ApprovalStatus.REJECTED,
      voidReason: "Egreso duplicado, se anuló",
      createdByUserId: empleado1.id,
      rejectedByUserId: vanina.id,
      voidedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000 - 5 * 60 * 1000),
    },
    {
      type: MovementType.SALE,
      amount: 3800,
      paymentMethod: PaymentMethod.TRANSFER,
      description: null,
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.NOT_REQUIRED,
      createdByUserId: vanina.id,
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
    },
    {
      type: MovementType.EXPENSE,
      amount: 5000,
      paymentMethod: PaymentMethod.TRANSFER,
      description: "Pago proveedor papelería",
      status: MovementStatus.ACTIVE,
      approvalStatus: ApprovalStatus.PENDING,
      createdByUserId: empleado2.id,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  ];

  for (const mov of movements) {
    const code = await getNextCode("movement", "MOV");
    await prisma.cashMovement.create({
      data: {
        code,
        cashSessionId: session.id,
        withoutCashSession: false,
        ...mov,
      } as Parameters<typeof prisma.cashMovement.create>[0]["data"],
    });
  }

  console.log("✅ Movimientos de la sesión creados:", movements.length);

  const closureCode = await getNextCode("closure", "CIERRE");
  await prisma.cashClosure.create({
    data: {
      code: closureCode,
      cashSessionId: session.id,
      type: ClosureType.PARTIAL,
      expectedTotal: 24200,
      countedTotal: 24000,
      differenceTotal: -200,
      notes: "Faltante de $200 detectado, se revisará",
      status: ClosureStatus.APPROVED,
      createdByUserId: empleado1.id,
      reviewedByUserId: vanina.id,
      reviewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Cierre parcial demo creado");
  console.log("🎉 Seed completado exitosamente!");
  console.log("\nUsuarios disponibles:");
  console.log("  - Vanina (Admin) — PIN: 1234");
  console.log("  - Male (sin PIN)");
  console.log("  - Ariel (sin PIN)");
  console.log("  - Maty (sin PIN)");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
