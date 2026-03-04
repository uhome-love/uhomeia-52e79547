import { Target, FileText, ShoppingCart, DollarSign } from "lucide-react";

interface Props {
  visitas: number;
  propostas: number;
  vendas: number;
  vgv: number;
}

const fmtCurrency = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const cards = (p: Props) => [
  { label: "Visitas Realizadas", value: String(p.visitas), icon: Target, color: "text-primary" },
  { label: "Propostas Estimadas", value: String(p.propostas), icon: FileText, color: "text-warning" },
  { label: "Vendas Previstas", value: String(p.vendas), icon: ShoppingCart, color: "text-success" },
  { label: "VGV Previsto", value: fmtCurrency(p.vgv), icon: DollarSign, color: "text-accent-foreground" },
];

export default function ForecastCards(props: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards(props).map(c => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <span className="text-xs font-medium">{c.label}</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
