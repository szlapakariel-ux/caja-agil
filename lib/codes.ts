import prisma from "./prisma";

export async function getNextCode(name: string, prefix: string): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { name },
    update: { current: { increment: 1 } },
    create: { name, current: 1 },
  });
  return `${prefix}-${String(counter.current).padStart(4, "0")}`;
}

export async function getNextMovementCode(): Promise<string> {
  return getNextCode("movement", "MOV");
}

export async function getNextSessionCode(): Promise<string> {
  return getNextCode("session", "CAJA");
}

export async function getNextClosureCode(): Promise<string> {
  return getNextCode("closure", "CIERRE");
}
