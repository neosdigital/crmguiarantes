import { NextResponse } from "next/server";
import { requireBrokerSession, jsonError } from "@/lib/api";
import { claimLead, ClaimError } from "@crm/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, brokerId } = await requireBrokerSession();
    const { id } = await params;

    const assignment = await claimLead({
      organizationId: session.user.organizationId,
      leadId: id,
      brokerId,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    if (error instanceof ClaimError) {
      const statusByCode = { NOT_FOUND: 404, ALREADY_HANDLED: 409, EXPIRED: 409, WRONG_BROKER: 409 } as const;
      return NextResponse.json({ error: error.message, code: error.code }, { status: statusByCode[error.code] });
    }
    return jsonError(error);
  }
}
