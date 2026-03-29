/**
 * LeadMatchesWidget — Shows top auto-matched properties for a lead.
 * Used inside the lead detail tabs (Radar Imóveis).
 */
import { useState } from "react";
import { useLeadPropertyMatches } from "@/hooks/useLeadPropertyMatches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Star, Eye, Send, X, ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  leadId: string;
  leadNome: string;
  leadTelefone?: string | null;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val);
}

function scoreBadge(score: number) {
  if (score >= 80) return { label: `${score}%`, cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" };
  if (score >= 60) return { label: `${score}%`, cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" };
  if (score >= 40) return { label: `${score}%`, cls: "bg-orange-500/15 text-orange-700 border-orange-500/30" };
  return { label: `${score}%`, cls: "bg-muted text-muted-foreground border-border" };
}

const STATUS_ICONS: Record<string, { icon: typeof Star; cls: string }> = {
  favorito: { icon: Star, cls: "text-amber-500" },
  enviado: { icon: Send, cls: "text-primary" },
  descartado: { icon: X, cls: "text-destructive" },
};

export default function LeadMatchesWidget({ leadId, leadNome, leadTelefone }: Props) {
  const { matches, isLoading, refreshMatches, isRefreshing, updateMatchStatus } = useLeadPropertyMatches(leadId);
  const [filter, setFilter] = useState<"all" | "novo" | "favorito" | "enviado">("all");

  const filtered = matches.filter(m => {
    if (filter === "all") return m.status !== "descartado";
    return m.status === filter;
  });

  const handleRefresh = async () => {
    try {
      await refreshMatches();
      toast.success("Matches atualizados com sucesso!");
    } catch {
      toast.error("Erro ao atualizar matches");
    }
  };

  const handleCopyWhatsApp = (m: typeof matches[0]) => {
    if (!m.property) return;
    const p = m.property;
    const text = [
      `🏠 *${p.titulo || p.empreendimento || "Imóvel"}*`,
      `📍 ${p.bairro}`,
      `🛏 ${p.dormitorios} dorm${p.suites ? ` (${p.suites} suíte${p.suites > 1 ? "s" : ""})` : ""} · 🚗 ${p.vagas} vaga${p.vagas !== 1 ? "s" : ""}`,
      p.area_privativa ? `📐 ${p.area_privativa}m²` : "",
      p.valor_venda ? `💰 ${formatCurrency(p.valor_venda)}` : "",
      `\n🔗 ${window.location.origin}/imovel/${p.codigo}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copiado para WhatsApp!");
    updateMatchStatus({ matchId: m.id, status: "enviado" });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Matches Automáticos</h3>
          {matches.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{matches.length}</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] gap-1"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Atualizar
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1">
        {([
          { value: "all" as const, label: "Todos" },
          { value: "novo" as const, label: "🆕 Novos" },
          { value: "favorito" as const, label: "⭐ Favoritos" },
          { value: "enviado" as const, label: "📨 Enviados" },
        ]).map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "text-[10px] px-2 py-1 rounded-md border transition-colors",
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:border-primary/50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-6 space-y-2">
          <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground">
            {matches.length === 0
              ? "Nenhum match encontrado. Preencha o perfil de interesse e clique em Atualizar."
              : "Nenhum resultado com este filtro."}
          </p>
        </div>
      )}

      {/* Match cards */}
      <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
        {filtered.map(m => {
          const p = m.property;
          if (!p) return null;
          const badge = scoreBadge(m.score);
          const statusIcon = STATUS_ICONS[m.status];

          return (
            <div
              key={m.id}
              className={cn(
                "border rounded-lg overflow-hidden max-h-[200px] transition-all flex flex-col",
                m.status === "descartado" && "opacity-40",
                m.status === "favorito" && "border-amber-500/30 bg-amber-500/5",
              )}
            >
              {p.fotos?.[0] && (
                <img src={p.fotos[0]} alt="" className="h-[100px] w-full object-cover shrink-0" />
              )}
              <div className="p-2 flex flex-col gap-1 flex-1 min-h-0">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={cn("text-[10px] font-bold px-1.5 py-0.5", badge.cls)}>
                    {badge.label}
                  </Badge>
                  {statusIcon && <statusIcon.icon className={cn("h-3 w-3", statusIcon.cls)} />}
                </div>
                <p className="text-xs font-medium text-foreground truncate">
                  {p.titulo || p.empreendimento || `Cód. ${p.codigo}`}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {p.bairro} · {p.dormitorios}d{p.suites ? `/${p.suites}s` : ""} · {p.vagas}v
                  {p.area_privativa ? ` · ${p.area_privativa}m²` : ""}
                </p>
                {p.valor_venda && (
                  <p className="text-xs font-medium text-[#4F46E5]">{formatCurrency(Number(p.valor_venda))}</p>
                )}
                <div className="flex items-center gap-1 mt-auto">
                  <Button
                    size="sm"
                    variant={m.status === "favorito" ? "default" : "ghost"}
                    className="h-6 text-[11px] px-2 py-1 gap-1"
                    onClick={() => updateMatchStatus({ matchId: m.id, status: m.status === "favorito" ? "novo" : "favorito" })}
                  >
                    <Star className={cn("h-3 w-3", m.status === "favorito" && "fill-current")} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2 py-1 gap-1 text-emerald-600"
                    onClick={() => handleCopyWhatsApp(m)}
                    title="Copiar para WhatsApp"
                  >
                    <Send className="h-3 w-3" /> WA
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2 py-1 gap-1"
                    onClick={() => window.open(`/imovel/${p.codigo}`, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px] px-2 py-1 gap-1 text-destructive"
                    onClick={() => updateMatchStatus({ matchId: m.id, status: "descartado" })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
