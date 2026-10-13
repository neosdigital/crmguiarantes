import { auth } from "@/auth";
import { prisma, type Role } from "@crm/db";
import { ApiError } from "@/lib/errors";

export { ApiError, jsonError } from "@/lib/errors";

/** Garante que existe uma sessão válida e, opcionalmente, que o role está entre os permitidos. */
export async function requireSession(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError(401, "Sua sessão expirou. Faça login novamente.");
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new ApiError(403, "Você não tem permissão para acessar este recurso.");
  }
  return session;
}

/**
 * Perfil de corretor (linha em `brokers`) do usuário logado, lido do banco a cada chamada —
 * não do JWT — para que um dono/admin colocado na roleta depois do login já consiga atuar
 * como corretor sem sair e entrar de novo. Qualquer role pode ter perfil de corretor.
 */
export async function getBrokerIdForUser(userId: string, organizationId: string): Promise<string | null> {
  const broker = await prisma.broker.findUnique({ where: { userId }, select: { id: true, organizationId: true } });
  return broker && broker.organizationId === organizationId ? broker.id : null;
}

/** Sessão + perfil de corretor obrigatório (área do corretor, assumir lead). */
export async function requireBrokerSession() {
  const session = await requireSession();
  const brokerId = await getBrokerIdForUser(session.user.id, session.user.organizationId);
  if (!brokerId) throw new ApiError(403, "Usuário não é um corretor.");
  return { session, brokerId };
}
