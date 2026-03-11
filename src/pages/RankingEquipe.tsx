import { useState } from "react";
import { Trophy, Phone, DollarSign, ClipboardList, Star } from "lucide-react";
import RankingOfertaAtivaTab from "@/components/ranking/RankingOfertaAtivaTab";
import RankingVGVTab from "@/components/ranking/RankingVGVTab";
import RankingGestaoLeadsTab from "@/components/ranking/RankingGestaoLeadsTab";
import RankingGeralTab from "@/components/ranking/RankingGeralTab";
import RankingExplanation from "@/components/ranking/RankingExplanation";

type Period = "hoje" | "semana" | "mes";

const periodLabels: Record<Period, string> = {
  hoje: "Hoje",
  semana: "Esta Semana",
  mes: "Este Mês",
};

const explanations = {
  "oferta-ativa": {
    titulo: "Como funciona o Ranking de Oferta Ativa?",
    descricao: "Mede a produtividade e qualidade das ligações de prospecção",
    corDestaque: "text-blue-600",
    criterios: [
      { label: "Ligações Realizadas", desc: "Cada tentativa de contato telefônico na Arena de Ligação conta como atividade." },
      { label: "Aproveitamentos", desc: "Leads que demonstraram interesse durante a ligação (agendou visita, pediu proposta, etc)." },
      { label: "Taxa de Conversão", desc: "Percentual de aproveitamentos sobre total de ligações — mede a qualidade da abordagem." },
      { label: "Pontuação", desc: "Combinação de volume (ligações) + qualidade (aproveitamentos). Mais ligações com boa taxa = mais pontos." },
    ],
  },
  gestao: {
    titulo: "Como funciona o Ranking de Gestão de Leads?",
    descricao: "Avalia como o corretor cuida e evolui seus leads no CRM",
    corDestaque: "text-purple-600",
    criterios: [
      { label: "Tentativas de Contato", desc: "Número total de tentativas registradas no pipeline — demonstra proatividade." },
      { label: "Leads que Responderam", desc: "Quantos leads efetivamente interagiram após o contato do corretor." },
      { label: "Visitas Marcadas", desc: "Leads que evoluíram para uma visita agendada — indicador de avanço no funil." },
      { label: "Propostas Enviadas", desc: "Quantas propostas foram geradas — estágio avançado de negociação." },
      { label: "Pontuação", desc: "Soma ponderada: tentativas(1pt) + responderam(3pts) + visitas(5pts) + propostas(8pts)." },
    ],
  },
  vgv: {
    titulo: "Como funciona o Ranking de Negócios (VGV)?",
    descricao: "O ranking mais importante — mede conversão em vendas reais",
    corDestaque: "text-emerald-600",
    criterios: [
      { label: "Propostas", desc: "Número de propostas formais enviadas a clientes no período." },
      { label: "VGV Gerado (Propostas)", desc: "Valor total das propostas enviadas — mostra o potencial de fechamento." },
      { label: "Vendas Realizadas", desc: "Negócios efetivamente assinados no período." },
      { label: "VGV Assinado", desc: "Volume Geral de Vendas efetivamente assinado — o fator determinante deste ranking." },
      { label: "Score", desc: "Pontuação baseada em VGV assinado como principal métrica, com bônus por volume de propostas." },
    ],
  },
};

type TabKey = "geral" | "oferta-ativa" | "vgv" | "gestao";

export default function RankingEquipe() {
  const [period, setPeriod] = useState<Period>("hoje");
  const [activeTab, setActiveTab] = useState<TabKey>("geral");

  const tabs = [
    { key: "geral" as const, label: "Geral", icon: Star, color: "text-amber-500" },
    { key: "oferta-ativa" as const, label: "Oferta Ativa", icon: Phone, color: "text-blue-600" },
    { key: "gestao" as const, label: "Gestão de Leads", icon: ClipboardList, color: "text-purple-600" },
    { key: "vgv" as const, label: "Negócios (VGV)", icon: DollarSign, color: "text-emerald-600" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-500" /> 🏆 Rankings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare sua performance com o time em 4 categorias
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(Object.entries(periodLabels) as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors border ${
                period === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:bg-accent"
              }`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: "2px solid hsl(var(--border))" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors relative whitespace-nowrap ${
              activeTab === tab.key
                ? `${tab.color} font-semibold`
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={{
              borderBottom: activeTab === tab.key ? "3px solid currentColor" : "3px solid transparent",
              marginBottom: -2,
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Explanation for specific tabs */}
      {activeTab === "oferta-ativa" && <RankingExplanation {...explanations["oferta-ativa"]} />}
      {activeTab === "gestao" && <RankingExplanation {...explanations.gestao} />}
      {activeTab === "vgv" && <RankingExplanation {...explanations.vgv} />}

      {/* Tab Content */}
      {activeTab === "geral" && <RankingGeralTab period={period} />}
      {activeTab === "oferta-ativa" && <RankingOfertaAtivaTab period={period} />}
      {activeTab === "vgv" && <RankingVGVTab period={period} />}
      {activeTab === "gestao" && <RankingGestaoLeadsTab period={period} />}
    </div>
  );
}
