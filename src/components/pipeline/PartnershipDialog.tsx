import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users, Percent, Loader2, UserPlus, Handshake } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadNome: string;
  corretorPrincipalId: string | null;
}

interface TeamMember {
  user_id: string;
  nome: string;
}

export default function PartnershipDialog({ open, onOpenChange, leadId, leadNome, corretorPrincipalId }: Props) {
  const { user } = useAuth();
  const [corretores, setCorretores] = useState<TeamMember[]>([]);
  const [parceiro, setParceiro] = useState("");
  const [divisao, setDivisao] = useState(50);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingPartnerships, setExistingPartnerships] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: members }, { data: partnerships }] = await Promise.all([
        supabase.from("team_members").select("user_id, nome").eq("status", "ativo"),
        supabase.from("pipeline_parcerias").select("*").eq("pipeline_lead_id", leadId),
      ]);
      setCorretores((members || []).filter(m => m.user_id && m.user_id !== corretorPrincipalId));
      setExistingPartnerships(partnerships || []);
    })();
  }, [open, leadId, corretorPrincipalId]);

  const handleSave = async () => {
    if (!parceiro || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("pipeline_parcerias").insert({
        pipeline_lead_id: leadId,
        corretor_principal_id: corretorPrincipalId || user.id,
        corretor_parceiro_id: parceiro,
        divisao_principal: 100 - divisao,
        divisao_parceiro: divisao,
        motivo: motivo || null,
        criado_por: user.id,
      });
      if (error) {
        if (error.code === "23505") toast.error("Parceria já existe com este corretor");
        else toast.error("Erro ao criar parceria");
        return;
      }
      toast.success("Parceria registrada com sucesso!");
      onOpenChange(false);
      setParceiro("");
      setDivisao(50);
      setMotivo("");
    } finally {
      setSaving(false);
    }
  };

  const PRESETS = [
    { label: "50/50", value: 50 },
    { label: "70/30", value: 30 },
    { label: "60/40", value: 40 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-5 w-5 text-primary" />
            Compartilhar Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>Registrar parceria para <strong>{leadNome}</strong></span>
          </div>

          {existingPartnerships.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Parcerias existentes</Label>
              {existingPartnerships.map((p) => {
                const parceiroNome = corretores.find(c => c.user_id === p.corretor_parceiro_id)?.nome || "Corretor";
                return (
                  <div key={p.id} className="flex items-center gap-2 text-xs bg-accent/50 rounded px-2 py-1.5">
                    <UserPlus className="h-3 w-3 text-primary" />
                    <span>{parceiroNome}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {p.divisao_principal}/{p.divisao_parceiro}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <Label className="text-xs">Corretor Parceiro</Label>
            <Select value={parceiro} onValueChange={setParceiro}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o corretor parceiro" />
              </SelectTrigger>
              <SelectContent>
                {corretores.map(c => (
                  <SelectItem key={c.user_id} value={c.user_id!}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <Percent className="h-3 w-3" />
              Divisão da Comissão
            </Label>
            <div className="flex items-center gap-2 mt-2">
              {PRESETS.map(p => (
                <Button
                  key={p.label}
                  variant={divisao === p.value ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setDivisao(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Slider
                value={[divisao]}
                onValueChange={([v]) => setDivisao(v)}
                min={10}
                max={90}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Principal: <strong className="text-foreground">{100 - divisao}%</strong></span>
                <span>Parceiro: <strong className="text-foreground">{divisao}%</strong></span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Motivo (opcional)</Label>
            <Input
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Cliente indicado pelo parceiro"
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!parceiro || saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
            Registrar Parceria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
