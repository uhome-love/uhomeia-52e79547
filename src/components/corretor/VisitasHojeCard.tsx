import { CalendarCheck, Clock, Phone, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VisitaHoje } from "@/hooks/useCorretorHomeData";

const STATUS_EMOJI: Record<string, string> = {
  marcada: "📅",
  confirmada: "✅",
  realizada: "🏠",
  reagendada: "🔄",
};

const STATUS_STYLE: Record<string, string> = {
  marcada: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  confirmada: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  realizada: "bg-green-600/10 text-green-700 border-green-600/30",
  reagendada: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

interface Props {
  visitas: VisitaHoje[];
  loading: boolean;
}

export default function VisitasHojeCard({ visitas, loading }: Props) {
  if (loading) return null;
  if (visitas.length === 0) return null;

  return (
    <Card className="border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <CalendarCheck className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Visitas Hoje</h3>
            <p className="text-[10px] text-muted-foreground">{visitas.length} visita{visitas.length > 1 ? "s" : ""} agendada{visitas.length > 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="space-y-2">
          {visitas.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 bg-card"
            >
              <span className="text-lg shrink-0">{STATUS_EMOJI[v.status] || "📅"}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-foreground truncate block">{v.nome_cliente}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {v.empreendimento && (
                    <span className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {v.empreendimento}
                    </span>
                  )}
                  {v.hora_visita && (
                    <span className="text-[10px] font-bold text-foreground flex items-center gap-0.5 shrink-0">
                      <Clock className="h-2.5 w-2.5" /> {v.hora_visita.substring(0, 5)}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`text-[8px] shrink-0 ${STATUS_STYLE[v.status] || ""}`}>
                {v.status}
              </Badge>
              {v.telefone && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => window.open(`tel:${v.telefone}`, "_self")}
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
