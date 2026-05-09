import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNextSessionCode } from "@/lib/codes";

export async function GET() {
  try {
    const openSession = await prisma.cashSession.findFirst({
      where: { status: "OPEN" },
      include: {
        openedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { openedAt: "desc" },
    });
    return NextResponse.json({ session: openSession });
  } catch {
    return NextResponse.json({ error: "Error al obtener sesión" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, openingAmount, notes } = await req.json();

    const existing = await prisma.cashSession.findFirst({ where: { status: "OPEN" } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya hay una caja abierta. Cerrala antes de abrir una nueva." },
        { status: 400 }
      );
    }

    const pendingMovements = await prisma.cashMovement.findMany({
      where: { cashSessionId: null, withoutCashSession: true, status: { not: "VOIDED" } },
    });

    const code = await getNextSessionCode();
    const session = await prisma.cashSession.create({
      data: {
        code,
        openingAmount: openingAmount ?? 0,
        status: "OPEN",
        openedByUserId: userId,
        notes,
      },
    });

    return NextResponse.json({ session, pendingMovements });
  } catch {
    return NextResponse.json({ error: "Error al abrir caja" }, { status: 500 });
  }
}
