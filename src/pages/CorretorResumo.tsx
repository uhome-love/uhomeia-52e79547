import { BarChart3 } from "lucide-react";
import CorretorWeeklySummary from "@/components/corretor/CorretorWeeklySummary";

export default function CorretorResumo() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Resumo Semanal
        </h1>
        <p className="text-sm text-muted-foreground">Sua evolução ao longo da semana</p>
      </div>
      <CorretorWeeklySummary />
    </div>
  );
}
