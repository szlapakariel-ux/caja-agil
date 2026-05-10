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
        avatarColor: true,
        avatarIcon: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    const usersForClient = users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatarColor: u.avatarColor,
      avatarIcon: u.avatarIcon,
    }));

    return NextResponse.json(usersForClient);
  } catch {
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}
