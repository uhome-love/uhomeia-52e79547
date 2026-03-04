import type { Lead } from "@/types/lead";
import { getDaysSinceContact } from "@/components/ReactivationPanel";

export interface LeadTask {
  id: string;
  leadId: string;
  leadNome: string;
  leadTelefone: string;
  titulo: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa" | "frio" | "perdido";
  venceEm: string; // ISO date
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function generateTasksForLeads(leads: Lead[]): LeadTask[] {
  const tasks: LeadTask[] = [];

  for (const lead of leads) {
    if (!lead.prioridade) continue;

    const days = getDaysSinceContact(lead.ultimoContato);

    switch (lead.prioridade) {
      case "alta":
        tasks.push({
          id: `task-${lead.id}-call`,
          leadId: lead.id,
          leadNome: lead.nome,
          leadTelefone: lead.telefone,
          titulo: "Ligar hoje",
          descricao: `Lead de alta prioridade com interesse em ${lead.interesse || "imóveis"}. Contato urgente.`,
          prioridade: "alta",
          venceEm: todayISO(),
          status: "pendente",
        });
        break;

      case "media":
        tasks.push({
          id: `task-${lead.id}-followup`,
          leadId: lead.id,
          leadNome: lead.nome,
          leadTelefone: lead.telefone,
          titulo: "Enviar follow-up",
          descricao: `Lead com interesse moderado. Enviar mensagem personalizada de acompanhamento.`,
          prioridade: "media",
          venceEm: addDays(1),
          status: "pendente",
        });
        break;

      case "baixa":
        tasks.push({
          id: `task-${lead.id}-nurture`,
          leadId: lead.id,
          leadNome: lead.nome,
          leadTelefone: lead.telefone,
          titulo: "Incluir em campanha",
          descricao: `Lead com baixo engajamento. Incluir em campanha de nutrição com novidades.`,
          prioridade: "baixa",
          venceEm: addDays(3),
          status: "pendente",
        });
        break;

      case "frio":
        tasks.push({
          id: `task-${lead.id}-reactivate`,
          leadId: lead.id,
          leadNome: lead.nome,
          leadTelefone: lead.telefone,
          titulo: "Reativar com oferta",
          descricao: `Lead frio (${days || "90+"}d sem contato). Enviar oferta especial ou novidade relevante.`,
          prioridade: "frio",
          venceEm: addDays(7),
          status: "pendente",
        });
        break;

      case "perdido":
        tasks.push({
          id: `task-${lead.id}-lastchance`,
          leadId: lead.id,
          leadNome: lead.nome,
          leadTelefone: lead.telefone,
          titulo: "Última tentativa",
          descricao: `Lead perdido (${days || "90+"}d). Última tentativa de contato antes de arquivar.`,
          prioridade: "perdido",
          venceEm: addDays(14),
          status: "pendente",
        });
        break;
    }
  }

  // Sort by priority: alta first, perdido last
  const order = { alta: 0, media: 1, baixa: 2, frio: 3, perdido: 4 };
  tasks.sort((a, b) => order[a.prioridade] - order[b.prioridade]);

  return tasks;
}
