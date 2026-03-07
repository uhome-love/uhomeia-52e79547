import type { PipelineLead, PipelineSegmento } from "@/hooks/usePipeline";
import { Phone, Mail, Clock, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PipelineCardProps {
  lead: PipelineLead;
  segmentos: PipelineSegmento[];
  onDragStart: () => void;
  onClick: () => void;
}

export default function PipelineCard({ lead, segmentos, onDragStart, onClick }: PipelineCardProps) {
  const segmento = segmentos.find(s => s.id === lead.segmento_id);
  const timeInStage = formatDistanceToNow(new Date(lead.stage_changed_at), { locale: ptBR, addSuffix: false });

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onClick={onClick}
      className="group rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-md transition-all duration-150 select-none"
    >
      {/* Name + Segmento */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-sm font-semibold text-foreground leading-tight truncate">
          {lead.nome}
        </span>
        {segmento && (
          <span
            className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: segmento.cor }}
          >
            {segmento.nome.split(" ")[0]}
          </span>
        )}
      </div>

      {/* Empreendimento */}
      {lead.empreendimento && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{lead.empreendimento}</span>
        </div>
      )}

      {/* Contact info */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-1.5">
        {lead.telefone && (
          <span className="flex items-center gap-0.5">
            <Phone className="h-3 w-3" />
            {lead.telefone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
          </span>
        )}
        {lead.email && (
          <span className="flex items-center gap-0.5 truncate">
            <Mail className="h-3 w-3" />
          </span>
        )}
      </div>

      {/* Footer: time in stage + origin */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
        <span className="flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {timeInStage}
        </span>
        {lead.origem && (
          <span className="truncate ml-1 capitalize">
            {lead.origem.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Value */}
      {lead.valor_estimado && lead.valor_estimado > 0 && (
        <div className="mt-1.5 text-[11px] font-bold text-primary">
          R$ {lead.valor_estimado.toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}
