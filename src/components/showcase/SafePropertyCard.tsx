import { Component, type ReactNode } from "react";
import { Building2, AlertTriangle } from "lucide-react";
import PropertyCard from "./PropertyCard";
import type { ShowcaseImovel } from "./types";

/**
 * Per-card error boundary: if one card crashes, the rest remain visible.
 */

interface BoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface BoundaryState {
  hasError: boolean;
}

class CardErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[PropertyCard] Render error:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl overflow-hidden flex flex-col items-center justify-center p-8 min-h-[280px]"
          style={{ border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 text-center">
            {this.props.fallbackTitle || "Imóvel indisponível"}
          </p>
          <p className="text-xs text-slate-400 mt-1 text-center">Não foi possível exibir este imóvel.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Sanitizes an imovel object to prevent null-access crashes.
 */
function sanitizeImovel(item: ShowcaseImovel): ShowcaseImovel {
  return {
    ...item,
    id: item.id ?? 0,
    titulo: item.titulo || "Imóvel",
    endereco: item.endereco ?? null,
    bairro: item.bairro ?? null,
    cidade: item.cidade ?? null,
    area: typeof item.area === "number" ? item.area : null,
    quartos: typeof item.quartos === "number" ? item.quartos : null,
    suites: typeof item.suites === "number" ? item.suites : null,
    vagas: typeof item.vagas === "number" ? item.vagas : null,
    banheiros: typeof item.banheiros === "number" ? item.banheiros : null,
    valor: typeof item.valor === "number" ? item.valor : null,
    fotos: Array.isArray(item.fotos) ? item.fotos.filter(f => typeof f === "string" && f.length > 0) : [],
    empreendimento: item.empreendimento ?? null,
    descricao: item.descricao ?? null,
    precoDe: item.precoDe ?? null,
    precoPor: item.precoPor ?? null,
    descontoMax: item.descontoMax ?? null,
    status: item.status ?? null,
    metragens: item.metragens ?? null,
    dorms: item.dorms ?? null,
    condicoes: item.condicoes ?? null,
    segmento: item.segmento ?? null,
  };
}

interface SafePropertyCardProps extends Omit<React.ComponentProps<typeof PropertyCard>, "item"> {
  item: ShowcaseImovel;
}

export default function SafePropertyCard({ item, ...props }: SafePropertyCardProps) {
  const safe = sanitizeImovel(item);
  return (
    <CardErrorBoundary fallbackTitle={safe.empreendimento || safe.titulo}>
      <PropertyCard item={safe} {...props} />
    </CardErrorBoundary>
  );
}
