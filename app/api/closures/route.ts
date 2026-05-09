import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNextClosureCode } from "@/lib/codes";
import {
  calculateExpectedBalance,
  calculateClosureDifference,
  MovementForCalc,
} from "@/lib/cash-rules";
import { MovementStatus, ApprovalStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const closures = await prisma.cashClosure.findMany({
      where: sessionId ? { cashSessionId: sessionId } : {},
      include: {
        createdBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(closures);
  } catch {
    return NextResponse.json({ error: "Error al obtener cierres" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, countedTotal, notes } = body;

    if (!userId || !type || countedTotal === undefined) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (type === "FINAL" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo el admin puede hacer cierre final" }, { status: 403 });
    }

    const openSession = await prisma.cashSession.findFirst({ where: { status: "OPEN" } });

    const movements = openSession
      ? await prisma.cashMovement.findMany({
          where: {
            cashSessionId: openSession.id,
            status: { not: MovementStatus.VOIDED },
          },
        })
      : [];

    const openingAmount = openSession
      ? openSession.openingAmount.toNumber()
      : 0;

    const movsForCalc: MovementForCalc[] = movements.map((m) => ({
      type: m.type,
      adjustmentDirection: m.adjustmentDirection,
      amount: m.amount,
      status: m.status,
      approvalStatus: m.approvalStatus,
      paymentMethod: m.paymentMethod,
    }));

    const expectedTotal = calculateExpectedBalance(openingAmount, movsForCalc);
    const difference = calculateClosureDifference(expectedTotal, parseFloat(countedTotal));

    const isAdmin = user.role === "ADMIN";
    const code = await getNextClosureCode();

    const closure = await prisma.cashClosure.create({
      data: {
        code,
        cashSessionId: openSession?.id ?? null,
        type,
        expectedTotal,
        countedTotal: parseFloat(countedTotal),
        differenceTotal: difference,
        notes: notes?.trim() || null,
        status: isAdmin ? "APPROVED" : "PENDING_REVIEW",
        createdByUserId: userId,
        reviewedByUserId: isAdmin ? userId : null,
        reviewedAt: isAdmin ? new Date() : null,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (type === "FINAL" && openSession) {
      await prisma.cashSession.update({
        where: { id: openSession.id },
        data: { status: "CLOSED", closedAt: new Date(), closedByUserId: userId },
      });
    }

    return NextResponse.json(closure, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear cierre" }, { status: 500 });
  }
}
