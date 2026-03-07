import { Kanban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { FunilItem } from "@/hooks/useCorretorHomeData";

interface Props {
  funil: FunilItem[];
  totalLeads: number;
  loading: boolean;
}

export default function MiniFunilPessoal({ funil, totalLeads, loading }: Props) {
  if (loading || funil.length === 0) return null;

  const maxCount = Math.max(...funil.map(f => f.count), 1);

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Kanban className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Meu Funil</h3>
              <p className="text-[10px] text-muted-foreground">{totalLeads} leads ativos</p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {funil.map((item) => {
            const widthPct = Math.max(8, Math.round((item.count / maxCount) * 100));
            return (
              <div key={item.stage_id} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-[100px] truncate text-right shrink-0">
                  {item.stage_nome}
                </span>
                <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1.5"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: item.stage_cor,
                      minWidth: "24px",
                    }}
                  >
                    <span className="text-[9px] font-bold text-white drop-shadow-sm">{item.count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
