import { useState, useMemo } from "react";
import { useCeoData, pct } from "@/hooks/useCeoData";
import { AlertTriangle, TrendingDown, PhoneOff, Target, FileText, Clock, Users, Info } from "lucide-react";

type AlertCategory = "all" | "critical" | "warning" | "info";

interface Alert {
  type: "critical" | "warning" | "info";
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  gerente: string;
  corretor?: string;
  category: string;
}

const categoryLabels: Record<AlertCategory, string> = {
  all: "Todos",
  critical: "Críticos",
  warning: "Atenção",
  info: "Informativos",
};

export default function CeoAlerts() {
  const { gerentes, allCorretores, loading } = useCeoData("semana");
  const [filter, setFilter] = useState<AlertCategory>("all");

  const alerts = useMemo<Alert[]>(() => {
    const a: Alert[] = [];

    for (const c of allCorretores) {
      // Muitas ligações, poucas visitas marcadas
      if (c.real_ligacoes >= 10 && c.real_visitas_marcadas <= 1) {
        a.push({
          type: "warning", icon: PhoneOff,
          title: "Ineficiência em ligações",
          description: `${c.corretor_nome} fez ${c.real_ligacoes} ligações mas marcou apenas ${c.real_visitas_marcadas} visita(s).`,
          gerente: c.gerente_nome, corretor: c.corretor_nome,
          category: "Conversão",
        });
      }

      // Visitas altas e propostas baixas
      if (c.real_visitas_realizadas >= 3 && c.real_propostas === 0) {
        a.push({
          type: "critical", icon: Target,
          title: "Gargalo de fechamento",
          description: `${c.corretor_nome} realizou ${c.real_visitas_realizadas} visitas mas não gerou propostas.`,
          gerente: c.gerente_nome, corretor: c.corretor_nome,
          category: "Funil",
        });
      }

      // Corretor com score muito baixo
      if (c.score <= 15 && (c.meta_ligacoes > 0 || c.meta_visitas_realizadas > 0)) {
        a.push({
          type: "critical", icon: TrendingDown,
          title: "Performance crítica",
          description: `${c.corretor_nome} está com score ${c.score}/100. Acompanhamento 1:1 urgente.`,
          gerente: c.gerente_nome, corretor: c.corretor_nome,
          category: "Performance",
        });
      }

      // Corretor sem atividade
      if (c.real_ligacoes === 0 && c.real_visitas_marcadas === 0 && c.real_visitas_realizadas === 0 && (c.meta_ligacoes > 0)) {
        a.push({
          type: "warning", icon: Clock,
          title: "Corretor sem atividade",
          description: `${c.corretor_nome} não registrou nenhuma atividade no período.`,
          gerente: c.gerente_nome, corretor: c.corretor_nome,
          category: "Atividade",
        });
      }
    }

    // Gerente abaixo da meta
    for (const g of gerentes) {
      const gPct = pct(
        g.totals.real_visitas_realizadas + g.totals.real_propostas,
        g.totals.meta_visitas_realizadas + g.totals.meta_propostas
      );
      if (gPct < 40 && (g.totals.meta_visitas_realizadas > 0 || g.totals.meta_propostas > 0)) {
        a.push({
          type: "warning", icon: AlertTriangle,
          title: "Gerente abaixo da meta",
          description: `${g.gerente_nome} está com ${gPct}% de atingimento em visitas + propostas.`,
          gerente: g.gerente_nome,
          category: "Meta",
        });
      }

      // Baixa conversão de visita
      const txVisita = g.totals.real_visitas_marcadas > 0 ? Math.round((g.totals.real_visitas_realizadas / g.totals.real_visitas_marcadas) * 100) : -1;
      if (txVisita >= 0 && txVisita < 40 && g.totals.real_visitas_marcadas >= 3) {
        a.push({
          type: "warning", icon: Target,
          title: "Baixa conversão de visita",
          description: `Equipe ${g.gerente_nome}: apenas ${txVisita}% de visitas marcadas foram realizadas.`,
          gerente: g.gerente_nome,
          category: "Conversão",
        });
      }

      // Queda de conversão proposta
      const txProposta = g.totals.real_visitas_realizadas > 0 ? Math.round((g.totals.real_propostas / g.totals.real_visitas_realizadas) * 100) : -1;
      if (txProposta >= 0 && txProposta < 15 && g.totals.real_visitas_realizadas >= 3) {
        a.push({
          type: "critical", icon: TrendingDown,
          title: "Queda de conversão",
          description: `Equipe ${g.gerente_nome}: taxa proposta/visita em ${txProposta}%.`,
          gerente: g.gerente_nome,
          category: "Conversão",
        });
      }
    }

    // Sort: critical first
    a.sort((x, y) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[x.type] - order[y.type];
    });
    return a;
  }, [gerentes, allCorretores]);

  const filteredAlerts = filter === "all" ? alerts : alerts.filter(a => a.type === filter);
  const criticalCount = alerts.filter(a => a.type === "critical").length;
  const warningCount = alerts.filter(a => a.type === "warning").length;
  const infoCount = alerts.filter(a => a.type === "info").length;

  return (
    <div className="space-y-4">
      {/* Category filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.entries(categoryLabels) as [AlertCategory, string][]).map(([key, label]) => {
          const count = key === "all" ? alerts.length : key === "critical" ? criticalCount : key === "warning" ? warningCount : infoCount;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                filter === key 
                  ? key === "critical" ? "bg-destructive/10 border-destructive/30 text-destructive" 
                    : key === "warning" ? "bg-warning/10 border-warning/30 text-warning"
                    : key === "info" ? "bg-info/10 border-info/30 text-info"
                    : "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando alertas...</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center">
          <p className="text-sm font-medium text-success">✅ Nenhum alerta no momento. Tudo dentro do esperado!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
              alert.type === "critical" ? "bg-destructive/5 border-destructive/20" : 
              alert.type === "warning" ? "bg-warning/5 border-warning/20" :
              "bg-info/5 border-info/20"
            }`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                alert.type === "critical" ? "bg-destructive/10" : alert.type === "warning" ? "bg-warning/10" : "bg-info/10"
              }`}>
                <alert.icon className={`h-4 w-4 ${alert.type === "critical" ? "text-destructive" : alert.type === "warning" ? "text-warning" : "text-info"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm text-foreground">{alert.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    alert.type === "critical" ? "bg-destructive/10 text-destructive" : 
                    alert.type === "warning" ? "bg-warning/10 text-warning" : 
                    "bg-info/10 text-info"
                  }`}>
                    {alert.type === "critical" ? "CRÍTICO" : alert.type === "warning" ? "ATENÇÃO" : "INFO"}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{alert.category}</span>
                </div>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Gerente: {alert.gerente}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
