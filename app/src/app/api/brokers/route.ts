import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { requireSession, jsonError, ApiError } from "@/lib/api";
import { scopedDb } from "@/lib/tenant-db";
import { prisma, Role } from "@crm/db";

export async function GET() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const db = scopedDb(session.user.organizationId);
    const brokers = await db.broker.findMany({
      orderBy: { rotationPosition: "asc" },
      include: { user: { select: { email: true, name: true, role: true } } },
    });
    return NextResponse.json({ brokers });
  } catch (error) {
    return jsonError(error);
  }
}

const createBrokerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  /** Também administrador: entra na roleta E acessa o painel do dono. */
  isAdmin: z.boolean().optional(),
});

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const body = createBrokerSchema.parse(await req.json());

    if (body.isAdmin && session.user.role !== "OWNER") {
      throw new ApiError(403, "Só o dono pode criar administradores.");
    }

    // Email de um dono/admin desta mesma organização que ainda não está na roleta: em vez de
    // criar outra conta, só adiciona o perfil de corretor ao usuário existente.
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() }, include: { broker: true } });
    const addExistingAdmin =
      existing?.organizationId === session.user.organizationId && existing.role !== Role.BROKER && !existing.broker;
    if (existing && !addExistingAdmin) throw new ApiError(409, "Já existe um usuário com este email.");

    const tempPassword = addExistingAdmin ? null : generateTempPassword();
    const passwordHash = tempPassword ? await bcrypt.hash(tempPassword, 10) : null;

    const result = await prisma.$transaction(async (tx) => {
      const maxPosition = await tx.broker.aggregate({
        where: { organizationId: session.user.organizationId },
        _max: { rotationPosition: true },
      });

      const user =
        addExistingAdmin && existing
          ? existing
          : await tx.user.create({
              data: {
                organizationId: session.user.organizationId,
                name: body.name,
                email: body.email.toLowerCase(),
                passwordHash: passwordHash!,
                role: body.isAdmin ? Role.ADMIN : Role.BROKER,
              },
            });

      const broker = await tx.broker.create({
        data: {
          organizationId: session.user.organizationId,
          userId: user.id,
          displayName: body.name.split(" ")[0],
          phone: body.phone,
          rotationPosition: (maxPosition._max.rotationPosition ?? 0) + 1,
        },
      });

      return { user, broker };
    });

    return NextResponse.json({ broker: result.broker, tempPassword }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
