import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { PipelineLead, PipelineStage, PipelineSegmento } from "@/hooks/usePipeline";
import { Phone, Mail, Calendar, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";

interface Props {
  lead: PipelineLead;
  stages: PipelineStage[];
  segmentos: PipelineSegmento[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (leadId: string, updates: Partial<PipelineLead>) => Promise<void>;
  onMove: (leadId: string, newStageId: string, observacao?: string) => Promise<void>;
}

export default function PipelineLeadDetail({ lead, stages, segmentos, open, onOpenChange, onUpdate, onMove }: Props) {
  const { isGestor, isAdmin } = useUserRole();
  const canEdit = isGestor || isAdmin || true; // corretores can edit their own leads
  const [saving, setSaving] = useState(false);
  const [obs, setObs] = useState(lead.observacoes || "");
  const [proximaAcao, setProximaAcao] = useState(lead.proxima_acao || "");
  const [dataProximaAcao, setDataProximaAcao] = useState(lead.data_proxima_acao || "");

  const currentStage = stages.find(s => s.id === lead.stage_id);
  const segmento = segmentos.find(s => s.id === lead.segmento_id);
  const timeInStage = formatDistanceToNow(new Date(lead.stage_changed_at), { locale: ptBR, addSuffix: true });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(lead.id, {
        observacoes: obs || null,
        proxima_acao: proximaAcao || null,
        data_proxima_acao: dataProximaAcao || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToStage = async (stageId: string) => {
    await onMove(lead.id, stageId);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-lg flex items-center gap-2">
            {lead.nome}
            {segmento && (
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: segmento.cor, color: segmento.cor }}>
                {segmento.nome}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Current stage */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: currentStage?.cor }} />
            <span className="text-sm font-semibold">{currentStage?.nome}</span>
            <span className="text-xs text-muted-foreground ml-auto">{timeInStage}</span>
          </div>

          <Separator />

          {/* Contact info */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contato</h4>
            {lead.telefone && (
              <a href={`tel:${lead.telefone}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {lead.telefone}
              </a>
            )}
            {lead.telefone2 && (
              <a href={`tel:${lead.telefone2}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {lead.telefone2}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {lead.email}
              </a>
            )}
            {lead.empreendimento && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {lead.empreendimento}
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {lead.origem && (
              <div>
                <span className="text-muted-foreground">Origem:</span>
                <span className="ml-1 capitalize font-medium">{lead.origem.replace(/_/g, " ")}</span>
              </div>
            )}
            {lead.valor_estimado && (
              <div>
                <span className="text-muted-foreground">Valor:</span>
                <span className="ml-1 font-bold text-primary">
                  R$ {lead.valor_estimado.toLocaleString("pt-BR")}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Criado em:</span>
              <span className="ml-1">{format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          <Separator />

          {/* Editable fields */}
          {canEdit && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Acompanhamento</h4>
              <div>
                <Label className="text-xs">Próxima Ação</Label>
                <Input
                  value={proximaAcao}
                  onChange={e => setProximaAcao(e.target.value)}
                  placeholder="Ex: Ligar para confirmar visita"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Data da Próxima Ação</Label>
                <Input
                  type="date"
                  value={dataProximaAcao}
                  onChange={e => setDataProximaAcao(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                  placeholder="Notas sobre o lead..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
              </Button>
            </div>
          )}

          <Separator />

          {/* Move to stage buttons */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mover para</h4>
            <div className="grid grid-cols-2 gap-2">
              {stages
                .filter(s => s.id !== lead.stage_id)
                .map(stage => (
                  <Button
                    key={stage.id}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-1.5 text-xs"
                    onClick={() => handleMoveToStage(stage.id)}
                  >
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: stage.cor }} />
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    {stage.nome}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
