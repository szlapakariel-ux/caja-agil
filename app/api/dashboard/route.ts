import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  calculateExpectedBalance,
  calculateExpectedBalanceByPaymentMethod,
  summarizeMovements,
  MovementForCalc,
} from "@/lib/cash-rules";
import { MovementStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const openSession = await prisma.cashSession.findFirst({
      where: { status: "OPEN" },
      include: {
        openedBy: { select: { id: true, name: true } },
      },
    });

    const movements = await prisma.cashMovement.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const movsForCalc: MovementForCalc[] = movements.map((m) => ({
      type: m.type,
      adjustmentDirection: m.adjustmentDirection,
      amount: m.amount,
      status: m.status,
      approvalStatus: m.approvalStatus,
      paymentMethod: m.paymentMethod,
    }));

    const openingAmount = openSession?.openingAmount.toNumber() ?? 0;
    const expectedBalance = calculateExpectedBalance(openingAmount, movsForCalc);
    const balanceByPaymentMethod = calculateExpectedBalanceByPaymentMethod(movsForCalc);
    const summary = summarizeMovements(movsForCalc);

    const pendingClosures = await prisma.cashClosure.findMany({
      where: {
        status: "PENDING_REVIEW",
        ...(openSession ? { cashSessionId: openSession.id } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    const recentMovements = movements.slice(0, 10);

    return NextResponse.json({
      date,
      openSession,
      summary: {
        ...summary,
        openingAmount,
        expectedBalance,
        balanceByPaymentMethod,
      },
      recentMovements,
      pendingClosures,
      totalMovements: movements.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener dashboard" }, { status: 500 });
  }
}
