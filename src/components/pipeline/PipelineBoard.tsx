import { useState, useRef } from "react";
import type { PipelineStage, PipelineLead, PipelineSegmento } from "@/hooks/usePipeline";
import PipelineCard from "./PipelineCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface PipelineBoardProps {
  stages: PipelineStage[];
  leads: PipelineLead[];
  segmentos: PipelineSegmento[];
  onMoveLead: (leadId: string, newStageId: string) => void;
  onSelectLead: (lead: PipelineLead) => void;
}

export default function PipelineBoard({ stages, leads, segmentos, onMoveLead, onSelectLead }: PipelineBoardProps) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const dragLeadId = useRef<string | null>(null);

  const handleDragStart = (leadId: string) => {
    dragLeadId.current = leadId;
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    if (dragLeadId.current) {
      onMoveLead(dragLeadId.current, stageId);
      dragLeadId.current = null;
    }
  };

  const getLeadsForStage = (stageId: string) =>
    leads.filter(l => l.stage_id === stageId);

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4 min-w-max">
        {stages.map((stage) => {
          const stageLeads = getLeadsForStage(stage.id);
          const isDragOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              className={`flex flex-col w-[280px] shrink-0 rounded-xl border transition-all duration-200 ${
                isDragOver
                  ? "border-primary/50 bg-primary/5 shadow-lg"
                  : "border-border bg-muted/30"
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.cor }}
                  />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {stage.nome}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-bold">
                  {stageLeads.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-1.5 p-2 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
                {stageLeads.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/50">
                    Arraste leads aqui
                  </div>
                )}
                {stageLeads.map((lead) => (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    segmentos={segmentos}
                    onDragStart={() => handleDragStart(lead.id)}
                    onClick={() => onSelectLead(lead)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
