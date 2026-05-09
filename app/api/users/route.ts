import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    const usersForClient = users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
    }));

    return NextResponse.json(usersForClient);
  } catch {
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}
