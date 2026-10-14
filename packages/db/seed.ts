import { PrismaClient, Role, LeadStatus, AssignmentStatus, AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const ORG_SLUG = "guilherme-arantes";

// Nenhuma senha fica no código: cada execução gera senhas novas e as imprime no terminal.
// Para fixar a do dono, defina SEED_OWNER_PASSWORD no ambiente.
function generatePassword() {
  return crypto.randomBytes(6).toString("base64url");
}

const OWNER = {
  name: "Administrador",
  email: "guilherme@adm.com",
  password: process.env.SEED_OWNER_PASSWORD || generatePassword(),
};

const BROKERS = [
  { name: "José Roberto", email: "jose.roberto@guilhermearantes.com", password: generatePassword() },
  { name: "Guilherme Arantes", email: "guilherme@guilhermearantes.com", password: generatePassword() },
];

const CAMPAIGNS = [
  { campaignId: "cmp_1001", campaignName: "Apartamentos Itajaí", adsetId: "ads_2001", adsetName: "Interesse Apartamento", adId: "ad_3001", adName: "Apartamento 3 dormitórios" },
  { campaignId: "cmp_1002", campaignName: "Casas Centro", adsetId: "ads_2002", adsetName: "Interesse Casa", adId: "ad_3002", adName: "Casa 2 dormitórios com quintal" },
];

const LEAD_NAMES = [
  "Carla Souza", "Marcos Lima", "Ana Paula", "Bruno Ferreira", "Juliana Alves",
  "Rafael Oliveira", "Fernanda Costa", "Diego Martins", "Patricia Rocha", "Gustavo Pereira",
];

function randomPhone() {
  const n = Math.floor(10000000 + Math.random() * 89999999);
  return `5547${n}`;
}

async function main() {
  console.log("Seeding: Guilherme Arantes (ambiente de desenvolvimento)");

  // Reexecução idempotente: remove por completo a organização de seed anterior (cascata)
  // antes de recriar, para não deixar contas antigas órfãs quando os emails mudam.
  const previous = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (previous) {
    await prisma.organization.delete({ where: { id: previous.id } });
  }

  const org = await prisma.organization.create({
    data: {
      name: "Guilherme Arantes Corretor",
      slug: ORG_SLUG,
      responseTimeoutMinutes: 5,
    },
  });

  // currentPosition: 0 = "nenhum lead novo distribuído ainda" — o primeiro lead cai no
  // corretor #1 (ver assignNextLead em packages/db/src/rotation.ts).
  await prisma.rotationState.create({ data: { organizationId: org.id, currentPosition: 0 } });

  const ownerPasswordHash = await bcrypt.hash(OWNER.password, 10);
  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: OWNER.name,
      email: OWNER.email,
      passwordHash: ownerPasswordHash,
      role: Role.OWNER,
    },
  });
  console.log(`OWNER: ${owner.email} / senha: ${OWNER.password}`);

  const brokers = [];
  for (let i = 0; i < BROKERS.length; i++) {
    const b = BROKERS[i];
    const passwordHash = await bcrypt.hash(b.password, 10);

    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: b.name,
        email: b.email,
        passwordHash,
        role: Role.BROKER,
      },
    });

    const broker = await prisma.broker.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        displayName: b.name.split(" ")[0],
        phone: `+${randomPhone()}`,
        rotationPosition: i + 1,
        isInRotation: true,
      },
    });
    brokers.push(broker);
    console.log(`BROKER #${i + 1}: ${user.email} / senha: ${b.password}`);
  }

  const now = Date.now();
  for (let i = 0; i < LEAD_NAMES.length; i++) {
    const name = LEAD_NAMES[i];
    const campaign = CAMPAIGNS[i % CAMPAIGNS.length];
    const createdAt = new Date(now - (LEAD_NAMES.length - i) * 45 * 60 * 1000);

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        name,
        phone: `+${randomPhone()}`,
        email: `${name.toLowerCase().replace(/ /g, ".")}@example.com`,
        source: "meta_ads",
        platform: "facebook",
        ...campaign,
        formId: "form_9001",
        formName: "Formulário de Interesse",
        customFields: {
          "Qual imóvel você procura?": i % 2 === 0 ? "Apartamento" : "Casa",
          "Faixa de investimento": i % 3 === 0 ? "Até R$300.000" : "R$300.000 a R$600.000",
          "Tem interesse em financiamento?": i % 2 === 0 ? "Sim" : "Não",
        },
        status: LeadStatus.NEW,
        createdAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        action: AuditAction.LEAD_RECEIVED,
        entityType: "lead",
        entityId: lead.id,
        metadata: { source: "seed" },
        createdAt,
      },
    });

    // Simula distribuição simples só para os primeiros leads, deixando os últimos "NEW" sem assignment
    // para exercitar o motor de rotação real quando o usuário testar manualmente.
    if (i < 6) {
      const broker = brokers[i % brokers.length];
      const assignedAt = createdAt;
      const expiresAt = new Date(assignedAt.getTime() + org.responseTimeoutMinutes * 60 * 1000);
      const contacted = i % 2 === 0;

      await prisma.leadAssignment.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          brokerId: broker.id,
          attemptNumber: 1,
          assignedAt,
          expiresAt,
          status: contacted ? AssignmentStatus.CONTACTED : AssignmentStatus.EXPIRED,
          respondedAt: contacted ? new Date(assignedAt.getTime() + 90 * 1000) : null,
          responseType: contacted ? "CONTACTED" : null,
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: contacted ? LeadStatus.IN_PROGRESS : LeadStatus.EXPIRED,
          currentBrokerId: contacted ? broker.id : null,
          firstContactAt: contacted ? new Date(assignedAt.getTime() + 90 * 1000) : null,
        },
      });
    }
  }

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
