import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, movementIds, action } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (action === "assign" && movementIds?.length > 0) {
      await prisma.cashMovement.updateMany({
        where: { id: { in: movementIds } },
        data: { cashSessionId: sessionId, withoutCashSession: false },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al asignar movimientos" }, { status: 500 });
  }
}
