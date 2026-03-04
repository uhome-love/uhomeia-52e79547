import ForecastManagerPanel from "@/components/forecast/ForecastManagerPanel";
import { TrendingUp } from "lucide-react";

export default function ForecastDashboard() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Previsão de Vendas <span className="text-primary">Forecast IA</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Projeção inteligente de vendas e VGV com base nos dados atuais
        </p>
      </div>
      <ForecastManagerPanel />
    </div>
  );
}
