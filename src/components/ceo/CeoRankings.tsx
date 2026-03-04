import { useState, useMemo } from "react";
import { useCeoData, pct, type CeoPeriod } from "@/hooks/useCeoData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal } from "lucide-react";

type RankMetric = "score" | "vgv_assinado" | "vgv_gerado" | "visitas_realizadas" | "propostas" | "atingimento";

const metricLabels: Record<RankMetric, string> = {
  score: "Score Geral",
  vgv_assinado: "VGV Assinado",
  vgv_gerado: "VGV Gerado",
  visitas_realizadas: "Visitas Realizadas",
  propostas: "Propostas",
  atingimento: "% Atingimento",
};

export default function CeoRankings() {
  const [period, setPeriod] = useState<CeoPeriod>("semana");
  const [metric, setMetric] = useState<RankMetric>("score");
  const { gerentes, allCorretores, loading } = useCeoData(period);

  const sortedCorretores = useMemo(() => {
    const arr = [...allCorretores];
    arr.sort((a, b) => {
      if (metric === "score") return b.score - a.score;
      if (metric === "vgv_assinado") return b.real_vgv_assinado - a.real_vgv_assinado;
      if (metric === "vgv_gerado") return b.real_vgv_gerado - a.real_vgv_gerado;
      if (metric === "visitas_realizadas") return b.real_visitas_realizadas - a.real_visitas_realizadas;
      if (metric === "propostas") return b.real_propostas - a.real_propostas;
      const aPct = pct(a.real_ligacoes + a.real_visitas_realizadas + a.real_propostas, a.meta_ligacoes + a.meta_visitas_realizadas + a.meta_propostas);
      const bPct = pct(b.real_ligacoes + b.real_visitas_realizadas + b.real_propostas, b.meta_ligacoes + b.meta_visitas_realizadas + b.meta_propostas);
      return bPct - aPct;
    });
    return arr;
  }, [allCorretores, metric]);

  const sortedGerentes = useMemo(() => {
    const arr = [...gerentes];
    arr.sort((a, b) => {
      if (metric === "vgv_assinado") return b.totals.real_vgv_assinado - a.totals.real_vgv_assinado;
      if (metric === "visitas_realizadas") return b.totals.real_visitas_realizadas - a.totals.real_visitas_realizadas;
      return b.totals.score - a.totals.score;
    });
    return arr;
  }, [gerentes, metric]);

  const getValue = (c: typeof allCorretores[0]) => {
    if (metric === "score") return `${c.score} pts`;
    if (metric === "vgv_assinado") return `R$ ${c.real_vgv_assinado.toLocaleString("pt-BR")}`;
    if (metric === "vgv_gerado") return `R$ ${c.real_vgv_gerado.toLocaleString("pt-BR")}`;
    if (metric === "visitas_realizadas") return `${c.real_visitas_realizadas}`;
    if (metric === "propostas") return `${c.real_propostas}`;
    return `${pct(c.real_ligacoes + c.real_visitas_realizadas + c.real_propostas, c.meta_ligacoes + c.meta_visitas_realizadas + c.meta_propostas)}%`;
  };

  const medalColors = ["text-warning", "text-muted-foreground", "text-orange-600"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={v => setPeriod(v as CeoPeriod)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dia">Hoje</SelectItem>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mês</SelectItem>
          </SelectContent>
        </Select>
        <Select value={metric} onValueChange={v => setMetric(v as RankMetric)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(metricLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando rankings...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking Corretores */}
          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" />
              <h3 className="font-display font-semibold text-sm">Ranking Corretores</h3>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {sortedCorretores.map((c, i) => (
                <div key={c.corretor_id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-6 text-center font-display font-bold text-sm">
                    {i < 3 ? <Medal className={`h-4 w-4 mx-auto ${medalColors[i]}`} /> : <span className="text-muted-foreground">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.corretor_nome}</p>
                    <p className="text-[10px] text-muted-foreground">{c.gerente_nome}</p>
                  </div>
                  <span className="text-sm font-display font-bold text-foreground">{getValue(c)}</span>
                </div>
              ))}
              {sortedCorretores.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">Sem dados</div>}
            </div>
          </div>

          {/* Ranking Gerentes */}
          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold text-sm">Ranking Gerentes</h3>
            </div>
            <div className="divide-y divide-border">
              {sortedGerentes.map((g, i) => (
                <div key={g.gerente_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-6 text-center font-display font-bold text-sm">
                    {i < 3 ? <Medal className={`h-4 w-4 mx-auto ${medalColors[i]}`} /> : <span className="text-muted-foreground">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{g.gerente_nome}</p>
                    <p className="text-[10px] text-muted-foreground">{g.corretores.length} corretores</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center justify-center h-7 px-2 rounded-md text-xs font-bold ${g.totals.score >= 70 ? "bg-success/10 text-success" : g.totals.score >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                      {g.totals.score} pts
                    </span>
                  </div>
                </div>
              ))}
              {sortedGerentes.length === 0 && <div className="p-4 text-center text-muted-foreground text-sm">Sem dados</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
