import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNextMovementCode } from "@/lib/codes";
import { requiresApproval } from "@/lib/cash-rules";
import {
  MovementType,
  ApprovalStatus,
  AdjustmentDirection,
  PaymentMethod,
} from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const sessionId = searchParams.get("sessionId");
    const limit = searchParams.get("limit");

    let where: Record<string, unknown> = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    if (sessionId) {
      where.cashSessionId = sessionId;
    }

    const movements = await prisma.cashMovement.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: parseInt(limit) } : {}),
    });

    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: "Error al obtener movimientos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, amount, paymentMethod, description, adjustmentDirection } = body;

    if (!userId || !type || !amount || !paymentMethod) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (
      [MovementType.OWNER_WITHDRAWAL, MovementType.OWNER_CONTRIBUTION, MovementType.CASH_ADJUSTMENT].includes(type) &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Sin permisos para este tipo de movimiento" }, { status: 403 });
    }

    if (type === MovementType.CASH_ADJUSTMENT && !adjustmentDirection) {
      return NextResponse.json({ error: "El ajuste de caja requiere dirección (positivo/negativo)" }, { status: 400 });
    }

    if (type === MovementType.CASH_ADJUSTMENT && !description?.trim()) {
      return NextResponse.json({ error: "El ajuste de caja requiere motivo obligatorio" }, { status: 400 });
    }

    const openSession = await prisma.cashSession.findFirst({ where: { status: "OPEN" } });
    const withoutCashSession = !openSession;

    const needsApproval = requiresApproval(type, user.role);
    const approvalStatus: ApprovalStatus = needsApproval
      ? ApprovalStatus.PENDING
      : ApprovalStatus.NOT_REQUIRED;

    const code = await getNextMovementCode();

    const movement = await prisma.cashMovement.create({
      data: {
        code,
        cashSessionId: openSession?.id ?? null,
        withoutCashSession,
        type,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod as PaymentMethod,
        description: description?.trim() || null,
        adjustmentDirection: adjustmentDirection as AdjustmentDirection | null ?? null,
        status: "ACTIVE",
        approvalStatus,
        createdByUserId: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear movimiento" }, { status: 500 });
  }
}
