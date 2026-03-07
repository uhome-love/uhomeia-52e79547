import { Phone, MessageCircle, Clock, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FollowUpLead } from "@/hooks/useCorretorHomeData";

interface Props {
  leads: FollowUpLead[];
  loading: boolean;
}

function tempEmoji(temp: string) {
  if (temp === "quente") return "🔥";
  if (temp === "morno") return "🟡";
  return "🧊";
}

export default function FollowUpsDoDia({ leads, loading }: Props) {
  if (loading) return null;

  if (leads.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-4 text-center space-y-1">
          <div className="text-2xl">✅</div>
          <p className="text-sm font-bold text-foreground">Sem follow-ups pendentes!</p>
          <p className="text-[10px] text-muted-foreground">Todos os retornos estão em dia.</p>
        </CardContent>
      </Card>
    );
  }

  const atrasados = leads.filter(l => l.dias_atrasado > 0).length;

  return (
    <Card className="border-primary/15 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">O que fazer agora</h3>
              <p className="text-[10px] text-muted-foreground">{leads.length} follow-ups pendentes</p>
            </div>
          </div>
          {atrasados > 0 && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <AlertTriangle className="h-3 w-3" /> {atrasados} atrasados
            </Badge>
          )}
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                lead.dias_atrasado > 0
                  ? "bg-destructive/5 border-destructive/20"
                  : "bg-card border-border/60"
              }`}
            >
              <span className="text-sm shrink-0">{tempEmoji(lead.temperatura)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">{lead.nome}</span>
                  <Badge variant="secondary" className="text-[8px] h-4 px-1 shrink-0">{lead.stage_nome}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {lead.proxima_acao ? (
                    <span className="text-[10px] text-primary font-medium truncate">{lead.proxima_acao}</span>
                  ) : (
                    <span className="text-[10px] text-destructive font-medium">Sem ação definida</span>
                  )}
                  {lead.dias_atrasado > 0 && (
                    <span className="text-[9px] text-destructive font-bold flex items-center gap-0.5 shrink-0">
                      <Clock className="h-2.5 w-2.5" /> {lead.dias_atrasado}d atrás
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => lead.telefone && window.open(`tel:${lead.telefone}`, "_self")}
                  disabled={!lead.telefone}
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-600"
                  onClick={() => lead.telefone && window.open(`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`, "_blank")}
                  disabled={!lead.telefone}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
