import { useState, useMemo } from "react";
import { useCeoData, pct } from "@/hooks/useCeoData";
import { AlertTriangle, TrendingDown, PhoneOff, Target, FileText } from "lucide-react";

interface Alert {
  type: "critical" | "warning" | "info";
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  gerente: string;
  corretor?: string;
}

export default function CeoAlerts() {
  const { gerentes, allCorretores, loading } = useCeoData("semana");

  const alerts = useMemo<Alert[]>(() => {
    const a: Alert[] = [];

    for (const c of allCorretores) {
      // Muitas ligações, poucas visitas marcadas (ineficiência)
      if (c.real_ligacoes >= 10 && c.real_visitas_marcadas <= 1) {
        a.push({
          type: "warning", icon: PhoneOff,
          title: "Ineficiência em ligações",
          description: `${c.corretor_nome} fez ${c.real_ligacoes} ligações mas marcou apenas ${c.real_visitas_marcadas} visita(s). Pode necessitar de treinamento em qualificação.`,
          gerente: c.gerente_nome, corretor: c.corretor_nome,
        });
      }

      // Visitas altas e propostas baixas (gargalo de fechamento)
      if (c.real_visitas_realizadas >= 3 && c.real_propostas === 0) {
        a.push({
          type: "critical", icon: Target,
          title: "Gargalo de fechamento",
          description: `${c.corretor_nome} realizou ${c.real_visitas_realizadas} visitas mas não gerou propostas. Revisar abordagem de proposta.`,
          gerente: c.gerente_nome, corretor: c.corretor_nome,
        });
      }

      // Corretor com score muito baixo
      if (c.score <= 15 && (c.meta_ligacoes > 0 || c.meta_visitas_realizadas > 0)) {
        a.push({
          type: "critical", icon: TrendingDown,
          title: "Performance crítica",
          description: `${c.corretor_nome} está com score ${c.score}/100. Precisa de acompanhamento 1:1 urgente.`,
          gerente: c.gerente_nome, corretor: c.corretor_nome,
        });
      }
    }

    // Gerente abaixo da meta geral
    for (const g of gerentes) {
      const gPct = pct(
        g.totals.real_visitas_realizadas + g.totals.real_propostas,
        g.totals.meta_visitas_realizadas + g.totals.meta_propostas
      );
      if (gPct < 40 && (g.totals.meta_visitas_realizadas > 0 || g.totals.meta_propostas > 0)) {
        a.push({
          type: "warning", icon: AlertTriangle,
          title: "Gerente abaixo da meta",
          description: `${g.gerente_nome} está com apenas ${gPct}% de atingimento em visitas realizadas + propostas nesta semana.`,
          gerente: g.gerente_nome,
        });
      }
    }

    // Sort: critical first
    a.sort((x, y) => (x.type === "critical" ? -1 : 1) - (y.type === "critical" ? -1 : 1));
    return a;
  }, [gerentes, allCorretores]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Alertas automáticos baseados nos dados desta semana.</p>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando alertas...</div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center">
          <p className="text-sm font-medium text-success">✅ Nenhum alerta no momento. Tudo dentro do esperado!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
              alert.type === "critical" ? "bg-destructive/5 border-destructive/20" : "bg-warning/5 border-warning/20"
            }`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                alert.type === "critical" ? "bg-destructive/10" : "bg-warning/10"
              }`}>
                <alert.icon className={`h-4 w-4 ${alert.type === "critical" ? "text-destructive" : "text-warning"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm text-foreground">{alert.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    alert.type === "critical" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                  }`}>
                    {alert.type === "critical" ? "CRÍTICO" : "ATENÇÃO"}
                  </span>
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
