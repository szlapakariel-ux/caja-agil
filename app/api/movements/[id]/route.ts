import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNextMovementCode } from "@/lib/codes";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movement = await prisma.cashMovement.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
        rejectedBy: { select: { id: true, name: true } },
      },
    });

    if (!movement) {
      return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "CashMovement", entityId: id },
      include: { performedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ...movement, auditLogs });
  } catch {
    return NextResponse.json({ error: "Error al obtener movimiento" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, userId, reason, amount, description, paymentMethod, approvalStatus, adjustmentDirection } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const movement = await prisma.cashMovement.findUnique({ where: { id } });
    if (!movement) {
      return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
    }

    if (action === "void") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos para anular" }, { status: 403 });
      }
      if (!reason?.trim()) {
        return NextResponse.json({ error: "Se requiere motivo para anular" }, { status: 400 });
      }

      const updated = await prisma.cashMovement.update({
        where: { id },
        data: {
          status: "VOIDED",
          voidReason: reason,
          voidedAt: new Date(),
          approvalStatus: "REJECTED",
          rejectedByUserId: userId,
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: "CashMovement",
          entityId: id,
          action: "VOID",
          previousValue: { status: movement.status, approvalStatus: movement.approvalStatus },
          newValue: { status: "VOIDED", approvalStatus: "REJECTED" },
          performedByUserId: userId,
          reason,
        },
      });

      return NextResponse.json(updated);
    }

    if (action === "correct") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos para corregir" }, { status: 403 });
      }
      if (!reason?.trim()) {
        return NextResponse.json({ error: "Se requiere motivo para corregir" }, { status: 400 });
      }

      const updated = await prisma.cashMovement.update({
        where: { id },
        data: {
          status: "CORRECTED",
          correctionReason: reason,
          originalAmount: movement.originalAmount ?? movement.amount,
          originalDescription: movement.originalDescription ?? movement.description,
          ...(amount ? { amount: parseFloat(amount) } : {}),
          ...(description !== undefined ? { description: description?.trim() || null } : {}),
          ...(paymentMethod ? { paymentMethod } : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: "CashMovement",
          entityId: id,
          action: "CORRECTION",
          previousValue: {
            amount: movement.amount,
            description: movement.description,
            paymentMethod: movement.paymentMethod,
            status: movement.status,
          },
          newValue: {
            amount: amount ?? movement.amount,
            description: description ?? movement.description,
            paymentMethod: paymentMethod ?? movement.paymentMethod,
            status: "CORRECTED",
          },
          performedByUserId: userId,
          reason,
        },
      });

      return NextResponse.json(updated);
    }

    if (action === "approve") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }

      const updated = await prisma.cashMovement.update({
        where: { id },
        data: { approvalStatus: "APPROVED", approvedByUserId: userId },
      });

      return NextResponse.json(updated);
    }

    if (action === "reject") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }

      await prisma.cashMovement.update({
        where: { id },
        data: {
          approvalStatus: "REJECTED",
          rejectedByUserId: userId,
          voidReason: reason,
        },
      });

      if (approvalStatus === "void") {
        const updated = await prisma.cashMovement.update({
          where: { id },
          data: { status: "VOIDED", voidedAt: new Date() },
        });
        await prisma.auditLog.create({
          data: {
            entityType: "CashMovement",
            entityId: id,
            action: "REJECT_AND_VOID",
            previousValue: { approvalStatus: movement.approvalStatus },
            newValue: { approvalStatus: "REJECTED", status: "VOIDED" },
            performedByUserId: userId,
            reason,
          },
        });
        return NextResponse.json(updated);
      }

      const updated = await prisma.cashMovement.findUnique({ where: { id } });
      await prisma.auditLog.create({
        data: {
          entityType: "CashMovement",
          entityId: id,
          action: "REJECT",
          previousValue: { approvalStatus: movement.approvalStatus },
          newValue: { approvalStatus: "REJECTED" },
          performedByUserId: userId,
          reason,
        },
      });

      return NextResponse.json(updated);
    }

    if (action === "reject-and-correct") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
      if (!reason?.trim()) {
        return NextResponse.json({ error: "Se requiere motivo" }, { status: 400 });
      }

      const updated = await prisma.cashMovement.update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
          approvedByUserId: userId,
          status: "CORRECTED",
          correctionReason: reason,
          originalAmount: movement.originalAmount ?? movement.amount,
          originalDescription: movement.originalDescription ?? movement.description,
          ...(amount ? { amount: parseFloat(amount) } : {}),
          ...(description !== undefined ? { description: description?.trim() || null } : {}),
          ...(paymentMethod ? { paymentMethod } : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: "CashMovement",
          entityId: id,
          action: "REJECT_AND_CORRECT",
          previousValue: {
            approvalStatus: movement.approvalStatus,
            amount: movement.amount,
            description: movement.description,
            paymentMethod: movement.paymentMethod,
          },
          newValue: {
            approvalStatus: "APPROVED",
            status: "CORRECTED",
            amount: amount ?? movement.amount,
            description: description ?? movement.description,
            paymentMethod: paymentMethod ?? movement.paymentMethod,
          },
          performedByUserId: userId,
          reason,
        },
      });

      return NextResponse.json(updated);
    }

    if (action === "reject-and-adjust") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
      if (!reason?.trim()) {
        return NextResponse.json({ error: "Se requiere motivo" }, { status: 400 });
      }

      const adjDirection = adjustmentDirection ?? "NEGATIVE";
      const adjAmount = amount ? parseFloat(amount) : Number(movement.amount);

      await prisma.cashMovement.update({
        where: { id },
        data: {
          approvalStatus: "REJECTED",
          rejectedByUserId: userId,
          status: "VOIDED",
          voidedAt: new Date(),
          voidReason: reason,
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: "CashMovement",
          entityId: id,
          action: "REJECT_AND_ADJUST",
          previousValue: { approvalStatus: movement.approvalStatus, status: movement.status },
          newValue: { approvalStatus: "REJECTED", status: "VOIDED" },
          performedByUserId: userId,
          reason,
        },
      });

      const newCode = await getNextMovementCode();
      const adjustment = await prisma.cashMovement.create({
        data: {
          code: newCode,
          cashSessionId: movement.cashSessionId,
          withoutCashSession: movement.withoutCashSession,
          type: "CASH_ADJUSTMENT",
          adjustmentDirection: adjDirection,
          amount: adjAmount,
          paymentMethod: paymentMethod ?? movement.paymentMethod,
          description: description?.trim() || reason,
          status: "ACTIVE",
          approvalStatus: "NOT_REQUIRED",
          createdByUserId: userId,
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: "CashMovement",
          entityId: adjustment.id,
          action: "CREATE_FROM_REJECTION",
          previousValue: undefined,
          newValue: { code: newCode, type: "CASH_ADJUSTMENT", amount: adjAmount },
          performedByUserId: userId,
          reason: `Generado al rechazar ${movement.code}`,
        },
      });

      return NextResponse.json(adjustment);
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error al procesar movimiento" }, { status: 500 });
  }
}
