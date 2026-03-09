import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, X, Phone, MessageCircle, Clock, AlertTriangle, Building2, User, Inbox } from "lucide-react";

interface PendingLead {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  empreendimento: string | null;
  origem: string | null;
  observacoes: string | null;
  aceite_expira_em: string | null;
  distribuido_em: string | null;
  prioridade_lead: string;
}

const STATUS_OPTIONS = [
  { value: "ligando_agora", label: "Ligando agora", icon: Phone },
  { value: "whatsapp", label: "Chamando WhatsApp", icon: MessageCircle },
  { value: "nao_atendeu", label: "Não atendeu", icon: X },
  { value: "contato_realizado", label: "Contato realizado", icon: Check },
];

const REJECTION_REASONS = [
  { value: "ocupado", label: "Estou ocupado" },
  { value: "cliente_repetido", label: "Cliente repetido" },
  { value: "fora_regiao", label: "Fora da minha região" },
  { value: "produto_nao_trabalha", label: "Não trabalho este produto" },
  { value: "outro", label: "Outro motivo" },
];

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining < 60;

  return (
    <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${
      isUrgent ? "text-destructive animate-pulse" : "text-amber-600"
    }`}>
      <Clock className="h-3.5 w-3.5" />
      {mins}:{secs.toString().padStart(2, "0")}
    </div>
  );
}

function LeadAcceptCard({ lead, onResult }: { lead: PendingLead; onResult: () => void }) {
  const [mode, setMode] = useState<"initial" | "rejecting">("initial");
  const [selectedStatus, setSelectedStatus] = useState("ligando_agora");
  const [selectedReason, setSelectedReason] = useState("ocupado");
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("distribute-lead", {
        body: { pipeline_lead_id: lead.id, action: "aceitar", status_inicial: selectedStatus },
      });
      if (error) throw error;
      if (data?.success === false) {
        toast.error(data.reason === "sla_expired" ? "SLA expirado. Lead redistribuído." : "Erro ao aceitar lead.");
      } else {
        toast.success("Lead aceito! Bom atendimento! 🚀");
      }
    } catch {
      toast.error("Erro ao aceitar lead");
    }
    setLoading(false);
    onResult();
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await supabase.functions.invoke("distribute-lead", {
        body: { pipeline_lead_id: lead.id, action: "rejeitar", motivo: selectedReason },
      });
      toast.info("Lead devolvido à roleta.");
    } catch {
      toast.error("Erro ao rejeitar lead");
    }
    setLoading(false);
    setMode("initial");
    onResult();
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{lead.nome}</CardTitle>
            <Badge variant={lead.prioridade_lead === "alta" ? "destructive" : "secondary"} className="text-[10px]">
              {lead.prioridade_lead === "alta" ? "PRIORIDADE ALTA" : "NORMAL"}
            </Badge>
          </div>
          {lead.aceite_expira_em && <CountdownTimer expiresAt={lead.aceite_expira_em} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm text-muted-foreground">
          {lead.telefone && <p>📞 {lead.telefone}</p>}
          {lead.empreendimento && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-primary">{lead.empreendimento}</span>
            </div>
          )}
          {lead.origem && <p className="text-xs">Origem: {lead.origem}</p>}
          {lead.observacoes && <p className="text-xs italic">"{lead.observacoes}"</p>}
        </div>

        {mode === "initial" ? (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Ao aceitar, qual será sua ação?</p>
              <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus} className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Label
                      key={opt.value}
                      htmlFor={`s-${lead.id}-${opt.value}`}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                        selectedStatus === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                      }`}
                    >
                      <RadioGroupItem value={opt.value} id={`s-${lead.id}-${opt.value}`} className="sr-only" />
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAccept} disabled={loading} className="flex-1 gap-2" size="sm">
                <Check className="h-4 w-4" /> Aceitar
              </Button>
              <Button onClick={() => setMode("rejecting")} disabled={loading} variant="outline" size="sm" className="gap-2">
                <X className="h-4 w-4" /> Rejeitar
              </Button>
            </div>
          </>
        ) : (
          <>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-1">
              {REJECTION_REASONS.map((r) => (
                <Label
                  key={r.value}
                  htmlFor={`r-${lead.id}-${r.value}`}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${
                    selectedReason === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                  }`}
                >
                  <RadioGroupItem value={r.value} id={`r-${lead.id}-${r.value}`} />
                  {r.label}
                </Label>
              ))}
            </RadioGroup>
            <div className="flex gap-2">
              <Button onClick={handleReject} disabled={loading} variant="destructive" size="sm" className="flex-1 gap-2">
                <X className="h-4 w-4" /> Confirmar Rejeição
              </Button>
              <Button onClick={() => setMode("initial")} variant="ghost" size="sm">Voltar</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AceiteLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<PendingLead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("pipeline_leads")
      .select("id, nome, telefone, email, empreendimento, origem, observacoes, aceite_expira_em, distribuido_em, prioridade_lead")
      .eq("corretor_id", user.id)
      .eq("aceite_status", "pendente")
      .order("distribuido_em", { ascending: true });
    setLeads((data as PendingLead[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("aceite-leads-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "pipeline_leads",
        filter: `corretor_id=eq.${user.id}`,
      }, () => fetchPending())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPending]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Inbox className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Aceite de Leads</h1>
          <p className="text-sm text-muted-foreground">Leads aguardando sua resposta</p>
        </div>
        {leads.length > 0 && (
          <Badge variant="destructive" className="ml-auto text-sm">{leads.length} pendente{leads.length > 1 ? "s" : ""}</Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Nenhum lead pendente</p>
            <p className="text-xs text-muted-foreground">Quando um novo lead for distribuído, ele aparecerá aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {leads.map((lead) => (
            <LeadAcceptCard key={lead.id} lead={lead} onResult={fetchPending} />
          ))}
        </div>
      )}
    </div>
  );
}
