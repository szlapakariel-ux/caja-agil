import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, action, notes } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (action === "approve") {
      const updated = await prisma.cashClosure.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          ...(notes ? { notes } : {}),
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error al actualizar cierre" }, { status: 500 });
  }
}
