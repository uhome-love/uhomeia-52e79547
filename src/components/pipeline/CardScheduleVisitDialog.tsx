import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PipelineLead, PipelineStage } from "@/hooks/usePipeline";

function cleanName(name: string) {
  if (!name) return "";
  const half = Math.floor(name.length / 2);
  const firstHalf = name.substring(0, half).trim();
  const secondHalf = name.substring(half).trim();
  if (firstHalf === secondHalf) return firstHalf;
  return name;
}

interface CardScheduleVisitDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: PipelineLead;
  stages: PipelineStage[];
  onMoveLead?: (leadId: string, stageId: string) => void;
}

export default function CardScheduleVisitDialog({ open, onOpenChange, lead, stages, onMoveLead }: CardScheduleVisitDialogProps) {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("10:00");
  const [local, setLocal] = useState("");
  const [obs, setObs] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!date || !user) return;
    const dateStr = format(date, "yyyy-MM-dd");
    await supabase.from("visitas").insert({
      nome_cliente: lead.nome,
      data_visita: dateStr,
      hora_visita: time,
      empreendimento: lead.empreendimento || "",
      corretor_id: lead.corretor_id || user.id,
      origem: "pipeline",
      status: "marcada",
      gerente_id: user.id,
      created_by: user.id,
      pipeline_lead_id: lead.id,
      local_visita: local || null,
      observacoes: obs || null,
    });
    if (onMoveLead) {
      const visitaStage = stages.find(s => s.nome.toLowerCase().includes("visita marcada") || s.tipo === "visita");
      if (visitaStage) onMoveLead(lead.id, visitaStage.id);
    }
    onOpenChange(false);
    setDate(undefined);
    setLocal("");
    setObs("");
    toast.success("📅 Visita agendada e lead movido");
  }, [date, time, local, obs, user, lead, stages, onMoveLead, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] p-5 gap-4">
        <DialogHeader className="p-0 mb-1">
          <DialogTitle className="text-base font-semibold">📅 Agendar Visita</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{cleanName(lead.nome)}</p>
        </DialogHeader>
        <CalendarPicker
          mode="single"
          selected={date}
          onSelect={setDate}
          className={cn("p-0 mx-auto pointer-events-auto border rounded-md")}
          locale={ptBR}
          disabled={(d) => d < startOfDay(new Date())}
        />
        <div className="space-y-3 mt-1">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Horário</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 text-sm w-full" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Empreendimento</label>
            <div className="text-sm font-medium text-foreground">
              {lead.empreendimento || <span className="text-amber-500">Sem empreendimento definido</span>}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Local da visita (opcional)</label>
            <Input placeholder="Ex: Stand do empreendimento, sala 3..." value={local} onChange={(e) => setLocal(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Observações (opcional)</label>
            <Input placeholder="Ex: Cliente prefere período da tarde..." value={obs} onChange={(e) => setObs(e.target.value)} className="h-9 text-sm" />
          </div>
          <Button className="w-full h-9 text-sm font-semibold mt-1" disabled={!date} onClick={handleSubmit}>
            <Calendar className="h-4 w-4 mr-1.5" /> Marcar Visita
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
