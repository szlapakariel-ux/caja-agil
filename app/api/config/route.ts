import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let config = await prisma.businessConfig.findFirst();
    if (!config) {
      config = await prisma.businessConfig.create({
        data: {
          businessName: "Librería",
          appDisplayName: "Caja Simple MVP",
          currency: "ARS",
          activePaymentMethods: ["CASH", "TRANSFER", "CARD", "MERCADO_PAGO", "OTHER"],
          themePreference: "system",
        },
      });
    }
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const config = await prisma.businessConfig.findFirst();
    const updated = config
      ? await prisma.businessConfig.update({
          where: { id: config.id },
          data: {
            businessName: body.businessName,
            appDisplayName: body.appDisplayName,
            activePaymentMethods: body.activePaymentMethods,
            themePreference: body.themePreference,
          },
        })
      : await prisma.businessConfig.create({ data: body });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
  }
}
