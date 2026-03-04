import { useForecast } from "@/hooks/useForecast";
import ForecastCards from "./ForecastCards";
import IaCoreAction from "@/components/IaCoreAction";
import { AlertTriangle, TrendingUp, Crown } from "lucide-react";

const fmtCurrency = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
};

export default function CeoForecastPanel() {
  const { gerentes, consolidado, loading } = useForecast();

  if (loading) return <div className="text-center py-12 text-muted-foreground">Carregando previsão consolidada...</div>;
  if (gerentes.length === 0) return <div className="text-center py-12 text-muted-foreground">Sem dados para gerar previsão.</div>;

  const gap = consolidado.meta_vendas > 0 ? consolidado.meta_vendas - consolidado.vendas_previstas : 0;

  const contextData = {
    consolidado,
    ranking: gerentes.map(g => ({
      gerente: g.gerente_nome,
      vendas_previstas: g.vendas_previstas,
      vgv_previsto: g.vgv_previsto,
      visitas: g.visitas_realizadas,
      conv_vp: `${(g.conv_visita_proposta * 100).toFixed(0)}%`,
      conv_pv: `${(g.conv_proposta_venda * 100).toFixed(0)}%`,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Previsão Consolidada do Mês
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Projeção de vendas e VGV de toda a empresa</p>
      </div>

      <ForecastCards
        visitas={consolidado.visitas_realizadas}
        propostas={consolidado.propostas_estimadas}
        vendas={consolidado.vendas_previstas}
        vgv={consolidado.vgv_previsto}
      />

      {/* Alert */}
      {gap > 0 && consolidado.meta_vendas > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-destructive/5 border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-foreground">⚠️ Previsão abaixo da meta mensal</p>
            <p className="text-xs text-muted-foreground mt-1">
              Previsão: <strong>{consolidado.vendas_previstas} vendas</strong> · Meta: <strong>{consolidado.meta_vendas}</strong> · Gap: <strong>{gap} vendas</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              VGV previsto: <strong>{fmtCurrency(consolidado.vgv_previsto)}</strong> · Meta VGV: <strong>{fmtCurrency(consolidado.meta_vgv)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Ranking por Gerente */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Ranking por Gerente — Previsão
          </h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-3 py-2 font-display font-semibold">Gerente</th>
              <th className="px-2 py-2 text-center">Visitas</th>
              <th className="px-2 py-2 text-center">Prop. Est.</th>
              <th className="px-2 py-2 text-center">Vendas Prev.</th>
              <th className="px-2 py-2 text-center">VGV Previsto</th>
              <th className="px-2 py-2 text-center">Conv. V→P</th>
              <th className="px-2 py-2 text-center">Conv. P→V</th>
            </tr>
          </thead>
          <tbody>
            {gerentes.map((g, i) => (
              <tr key={g.gerente_id} className="border-b border-border hover:bg-muted/10">
                <td className="px-3 py-2 font-medium">
                  {i === 0 && "🥇 "}{i === 1 && "🥈 "}{i === 2 && "🥉 "}
                  {g.gerente_nome}
                </td>
                <td className="px-2 py-2 text-center">{g.visitas_realizadas}</td>
                <td className="px-2 py-2 text-center">{g.propostas_estimadas}</td>
                <td className="px-2 py-2 text-center font-bold">{g.vendas_previstas}</td>
                <td className="px-2 py-2 text-center font-bold">{fmtCurrency(g.vgv_previsto)}</td>
                <td className="px-2 py-2 text-center">{(g.conv_visita_proposta * 100).toFixed(0)}%</td>
                <td className="px-2 py-2 text-center">{(g.conv_proposta_venda * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* IA Actions */}
      <div className="flex flex-wrap gap-2">
        <IaCoreAction
          module="ceo"
          prompt={`Como CEO, gere um DIAGNÓSTICO EXECUTIVO da previsão de vendas consolidada. Inclua: 1) Resumo macro 2) Ranking dos gerentes 3) Gargalos por gerente 4) Decisões recomendadas (5-8 ações) 5) Plano de alinhamento. Dados: ${JSON.stringify(contextData)}`}
          context={contextData}
          label="Gerar Diagnóstico CEO"
          variant="default"
        />
        <IaCoreAction
          module="ceo"
          prompt={`Gere um PLANO DE AÇÃO ESTRATÉGICO para aumentar as vendas previstas da empresa. Considere cada gerente individualmente e sugira onde treinar, onde cobrar, onde mudar rotina e onde priorizar produto. Dados: ${JSON.stringify(contextData)}`}
          context={contextData}
          label="Gerar Plano Estratégico"
        />
      </div>
    </div>
  );
}
