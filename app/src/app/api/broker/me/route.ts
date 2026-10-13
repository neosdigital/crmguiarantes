import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBrokerSession, jsonError } from "@/lib/api";
import { scopedDb } from "@/lib/tenant-db";

export async function GET() {
  try {
    const { session, brokerId } = await requireBrokerSession();
    const db = scopedDb(session.user.organizationId);
    const broker = await db.broker.findUnique({
      where: { id: brokerId },
      include: { user: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ broker });
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  phone: z.string().optional(),
  soundEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const { session, brokerId } = await requireBrokerSession();
    const body = patchSchema.parse(await req.json());
    const db = scopedDb(session.user.organizationId);
    const broker = await db.broker.update({ where: { id: brokerId }, data: body });
    return NextResponse.json({ broker });
  } catch (error) {
    return jsonError(error);
  }
}
