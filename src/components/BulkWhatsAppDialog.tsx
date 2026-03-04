import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, CheckCircle, XCircle, MessageSquare, Mail, Phone, Users, Building2, Megaphone, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/types/lead";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type Canal = "whatsapp" | "sms" | "email";
type SelectionMode = "todos" | "manual" | "empreendimento" | "origem";

interface BulkWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
}

const canalConfig: Record<Canal, { label: string; icon: typeof MessageSquare; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-success/10 text-success border-success/30" },
  sms: { label: "SMS", icon: Phone, color: "bg-info/10 text-info border-info/30" },
  email: { label: "E-mail", icon: Mail, color: "bg-primary/10 text-primary border-primary/30" },
};

const selectionModes: { key: SelectionMode; label: string; icon: typeof Users }[] = [
  { key: "todos", label: "Todos", icon: Users },
  { key: "manual", label: "Manual", icon: Filter },
  { key: "empreendimento", label: "Empreendimento", icon: Building2 },
  { key: "origem", label: "Campanha/Origem", icon: Megaphone },
];

const defaultMessages: Record<Canal, string> = {
  whatsapp: "Olá {nome}, tudo bem? Aqui é da UHome Imóveis. Gostaria de saber se ainda tem interesse em imóveis. Temos novidades incríveis! Posso te ajudar?",
  sms: "Olá {nome}! UHome Imóveis aqui. Temos novidades em imóveis para você. Responda SIM para saber mais!",
  email: "Olá {nome},\n\nEsperamos que esteja bem! Passando para compartilhar novidades da UHome Imóveis.\n\nTemos opções incríveis que podem ser perfeitas para você. Gostaria de saber mais?\n\nAbraço,\nEquipe UHome",
};

export default function BulkWhatsAppDialog({ open, onOpenChange, leads }: BulkWhatsAppDialogProps) {
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [mensagem, setMensagem] = useState(defaultMessages.whatsapp);
  const [assunto, setAssunto] = useState("Novidades UHome Imóveis para você, {nome}!");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ sent: number; failed: number } | null>(null);

  // Selection
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Grouped data
  const empreendimentos = useMemo(() => {
    const map = new Map<string, Lead[]>();
    leads.forEach((l) => {
      const key = l.interesse?.trim() || "Sem empreendimento";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [leads]);

  const origens = useMemo(() => {
    const map = new Map<string, Lead[]>();
    leads.forEach((l) => {
      const key = l.origem?.trim() || "Sem origem";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [leads]);

  // Filtered leads based on selection
  const selectedLeads = useMemo(() => {
    if (selectionMode === "todos") return leads;
    if (selectionMode === "manual") return leads.filter((l) => selectedIds.has(l.id));
    if (selectionMode === "empreendimento" && selectedGroup) {
      return leads.filter((l) => (l.interesse?.trim() || "Sem empreendimento") === selectedGroup);
    }
    if (selectionMode === "origem" && selectedGroup) {
      return leads.filter((l) => (l.origem?.trim() || "Sem origem") === selectedGroup);
    }
    return [];
  }, [leads, selectionMode, selectedIds, selectedGroup]);

  const targetLeads = useMemo(() => {
    if (canal === "email") return selectedLeads.filter((l) => l.email);
    return selectedLeads.filter((l) => l.telefone);
  }, [selectedLeads, canal]);

  const handleCanalChange = (newCanal: Canal) => {
    setCanal(newCanal);
    setMensagem(defaultMessages[newCanal]);
    setResults(null);
  };

  const handleSelectionModeChange = (mode: SelectionMode) => {
    setSelectionMode(mode);
    setSelectedIds(new Set());
    setSelectedGroup(null);
    setResults(null);
  };

  const toggleLead = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(leads.map((l) => l.id)));
  const selectNone = () => setSelectedIds(new Set());

  const handleBulkSend = async () => {
    setSending(true);
    setProgress(0);
    setResults(null);

    let sent = 0;
    let failed = 0;
    const total = targetLeads.length;

    for (let i = 0; i < total; i++) {
      const lead = targetLeads[i];
      const msgPersonalizada = mensagem.replace(/{nome}/g, lead.nome.split(" ")[0]);
      const assuntoPersonalizado = assunto.replace(/{nome}/g, lead.nome.split(" ")[0]);

      try {
        if (canal === "whatsapp") {
          const { data, error } = await supabase.functions.invoke("whatsapp-send", {
            body: { telefone: lead.telefone, mensagem: msgPersonalizada, nome: lead.nome },
          });
          if (error || !data?.success) failed++;
          else sent++;
        } else if (canal === "sms") {
          const phone = (lead.telefone || "").replace(/\D/g, "");
          const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
          window.open(`sms:+${fullPhone}?body=${encodeURIComponent(msgPersonalizada)}`, "_blank");
          sent++;
        } else if (canal === "email") {
          const mailto = `mailto:${lead.email}?subject=${encodeURIComponent(assuntoPersonalizado)}&body=${encodeURIComponent(msgPersonalizada)}`;
          window.open(mailto, "_blank");
          sent++;
        }
      } catch {
        failed++;
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      if (canal === "whatsapp" && i < total - 1) await new Promise((r) => setTimeout(r, 1500));
    }

    setResults({ sent, failed });
    setSending(false);
    toast.success(`Disparo concluído: ${sent} enviados, ${failed} falharam.`);
  };

  const handleClose = () => {
    if (!sending) {
      setResults(null);
      setProgress(0);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Disparo em Massa</DialogTitle>
          <DialogDescription>
            Selecione leads, escolha o canal e envie mensagens personalizadas. Use <code>{"{nome}"}</code> para personalizar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Canal selector */}
          <div className="flex gap-2">
            {(Object.keys(canalConfig) as Canal[]).map((c) => {
              const cfg = canalConfig[c];
              const Icon = cfg.icon;
              return (
                <button
                  key={c}
                  onClick={() => handleCanalChange(c)}
                  disabled={sending}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    canal === c
                      ? `${cfg.color} border-current ring-1 ring-current/20`
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Selection mode */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Selecionar leads por:</label>
            <div className="flex gap-1.5 flex-wrap">
              {selectionModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.key}
                    onClick={() => handleSelectionModeChange(mode.key)}
                    disabled={sending}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md border text-xs font-medium transition-all ${
                      selectionMode === mode.key
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selection content */}
          {selectionMode === "manual" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{selectedIds.size} de {leads.length} selecionados</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={selectAll}>Selecionar todos</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={selectNone}>Limpar</Button>
                </div>
              </div>
              <ScrollArea className="h-40 rounded-md border border-border">
                <div className="p-2 space-y-0.5">
                  {leads.map((lead) => (
                    <label key={lead.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-muted/30 cursor-pointer transition-colors">
                      <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleLead(lead.id)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground">{lead.nome}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{canal === "email" ? lead.email || "sem email" : lead.telefone || "sem tel"}</span>
                      </div>
                      {lead.interesse && <Badge variant="outline" className="text-[9px] h-4 px-1">{lead.interesse}</Badge>}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {selectionMode === "empreendimento" && (
            <ScrollArea className="h-40 rounded-md border border-border">
              <div className="p-2 space-y-1">
                {empreendimentos.map(([name, groupLeads]) => (
                  <button
                    key={name}
                    onClick={() => setSelectedGroup(name)}
                    className={`w-full flex items-center justify-between py-2 px-3 rounded-md text-left transition-all ${
                      selectedGroup === name
                        ? "bg-primary/10 border border-primary/30 text-primary"
                        : "hover:bg-muted/30 border border-transparent text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">{name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5">{groupLeads.length} leads</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {selectionMode === "origem" && (
            <ScrollArea className="h-40 rounded-md border border-border">
              <div className="p-2 space-y-1">
                {origens.map(([name, groupLeads]) => (
                  <button
                    key={name}
                    onClick={() => setSelectedGroup(name)}
                    className={`w-full flex items-center justify-between py-2 px-3 rounded-md text-left transition-all ${
                      selectedGroup === name
                        ? "bg-primary/10 border border-primary/30 text-primary"
                        : "hover:bg-muted/30 border border-transparent text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">{name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5">{groupLeads.length} leads</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Target count */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
            <Users className="h-3.5 w-3.5" />
            <span><strong className="text-foreground">{targetLeads.length}</strong> leads serão impactados via {canalConfig[canal].label}</span>
          </div>

          {canal === "email" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Assunto</label>
              <input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                disabled={sending}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Assunto do e-mail"
              />
            </div>
          )}

          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={canal === "email" ? 5 : 4}
            disabled={sending}
            className="resize-none"
          />

          {sending && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress}% concluído</p>
            </div>
          )}

          {results && (
            <div className="flex gap-4 justify-center text-sm">
              <span className="flex items-center gap-1 text-primary">
                <CheckCircle className="h-4 w-4" /> {results.sent} enviados
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" /> {results.failed} falharam
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            {results ? "Fechar" : "Cancelar"}
          </Button>
          {!results && (
            <Button onClick={handleBulkSend} disabled={sending || !mensagem.trim() || targetLeads.length === 0} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Enviando..." : `Enviar ${canalConfig[canal].label} (${targetLeads.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
