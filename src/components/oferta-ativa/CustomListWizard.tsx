import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ClipboardList, Briefcase, Trophy, HeartCrack, ArrowLeft, ArrowRight, Loader2, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCustomLists, resolveCustomListLeads, type CustomListFilters } from "@/hooks/useCustomLists";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import HomiInlineSuggestion from "@/components/homi/HomiInlineSuggestion";

const FONTES = [
  { id: "meus_leads", label: "Meus leads", sub: "Pipeline Leads", icon: ClipboardList, color: "text-blue-500" },
  { id: "meus_negocios", label: "Meus negócios", sub: "Pipeline PDN", icon: Briefcase, color: "text-amber-500" },
  { id: "pos_venda", label: "Pós-venda", sub: "Clientes ativos", icon: Trophy, color: "text-emerald-500" },
  { id: "perdidos", label: "Perdidos", sub: "Reengajar", icon: HeartCrack, color: "text-red-400" },
] as const;

const ETAPAS_LEADS = [
  "Novo Lead", "Contato Iniciado", "Qualificação",
  "Possível Visita", "Visita Marcada", "Visita Realizada"
];

const ETAPAS_PDN = ["Negociação", "Proposta", "Assinatura"];

const TEMPERATURAS = [
  { id: "quente", label: "🔥 Quente" },
  { id: "morno", label: "🌤️ Morno" },
  { id: "frio", label: "🧊 Frio" },
];

const TEMPO_SEM_CONTATO = [
  { id: "qualquer", label: "Qualquer" },
  { id: "3dias", label: "Mais de 3 dias" },
  { id: "7dias", label: "Mais de 7 dias" },
  { id: "15dias", label: "Mais de 15 dias" },
  { id: "nunca", label: "Nunca contatados" },
];

const MOTIVOS_PERDA = [
  { id: "preco", label: "💰 Preço" },
  { id: "timing", label: "⏰ Timing" },
  { id: "produto", label: "🏠 Produto" },
  { id: "indecisao", label: "🤔 Indecisão" },
  { id: "sumiu", label: "👻 Sumiu" },
];

const ORDENS = [
  { id: "score", label: "Score (maior primeiro)" },
  { id: "tempo_sem_contato", label: "Mais tempo sem contato" },
  { id: "alfabetica", label: "Ordem alfabética" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (listId: string) => void;
  initialFilters?: CustomListFilters;
}

function ChipToggle({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted text-muted-foreground border-border hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );
}

export default function CustomListWizard({ open, onClose, onCreated, initialFilters }: Props) {
  const { user } = useAuth();
  const { createList } = useCustomLists();
  const [step, setStep] = useState(1);
  const [filtros, setFiltros] = useState<CustomListFilters>(
    initialFilters || { fontes: [], ordem: "score" }
  );
  const [nome, setNome] = useState("");
  const [resolving, setResolving] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // Load empreendimentos from corretor's leads
  const { data: empreendimentos = [] } = useQuery({
    queryKey: ["custom-list-empreendimentos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("pipeline_leads")
        .select("empreendimento")
        .eq("corretor_id", user.id)
        .not("empreendimento", "is", null);
      const unique = [...new Set((data || []).map(d => d.empreendimento).filter(Boolean))];
      return unique as string[];
    },
    enabled: !!user && open,
  });

  // HOMI suggestion
  const { data: homiSuggestion } = useQuery({
    queryKey: ["custom-list-homi-suggestion", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Count leads in Qualificação without contact >5 days
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id, nome")
        .eq("ativo", true);
      const qualStage = (stages || []).find(s => s.nome === "Qualificação");
      if (!qualStage) return null;

      const cutoff = new Date(Date.now() - 5 * 86400000).toISOString();
      const { count } = await supabase
        .from("pipeline_leads")
        .select("id", { count: "exact", head: true })
        .eq("corretor_id", user.id)
        .eq("stage_id", qualStage.id)
        .lt("updated_at", cutoff);

      if (count && count >= 3) {
        return {
          text: `Você tem ${count} leads em Qualificação há mais de 5 dias sem contato. Vale uma lista focada nisso! 🎯`,
          filtros: {
            fontes: ["meus_leads"],
            etapas: ["Qualificação"],
            tempoSemContato: "3dias",
            ordem: "score",
          } as CustomListFilters,
        };
      }
      return null;
    },
    enabled: !!user && open && step === 1,
    staleTime: 60000,
  });

  // Count leads per fonte
  const { data: fonteCounts } = useQuery({
    queryKey: ["custom-list-fonte-counts", user?.id],
    queryFn: async () => {
      if (!user) return {} as Record<string, number>;
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id, pipeline_tipo")
        .eq("ativo", true);
      const { data: leads } = await supabase
        .from("pipeline_leads")
        .select("id, stage_id, motivo_descarte")
        .eq("corretor_id", user.id);

      const stageMap = new Map((stages || []).map(s => [s.id, s.pipeline_tipo]));
      const all = leads || [];
      return {
        meus_leads: all.filter(l => stageMap.get(l.stage_id) === "leads" && !l.motivo_descarte).length,
        meus_negocios: all.filter(l => stageMap.get(l.stage_id) === "negocios").length,
        pos_venda: 0, // placeholder
        perdidos: all.filter(l => l.motivo_descarte != null).length,
      };
    },
    enabled: !!user && open,
  });

  // Resolve preview when entering step 3
  useEffect(() => {
    if (step === 3 && user) {
      setResolving(true);
      resolveCustomListLeads(user.id, filtros).then(r => {
        setPreviewCount(r.count);
        setResolving(false);
      });
    }
  }, [step, user, filtros]);

  const toggleFonte = (id: string) => {
    setFiltros(f => ({
      ...f,
      fontes: f.fontes.includes(id) ? f.fontes.filter(x => x !== id) : [...f.fontes, id],
    }));
  };

  const toggleArrayFilter = (key: keyof CustomListFilters, value: string) => {
    setFiltros(f => {
      const arr = (f[key] as string[] | undefined) || [];
      return { ...f, [key]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] };
    });
  };

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const listName = nome.trim() || "Lista personalizada";
      const result = await createList.mutateAsync({ nome: listName, filtros });
      onCreated(result.id);
      onClose();
    } finally {
      setCreating(false);
    }
  };

  const handleUseSuggestion = () => {
    if (homiSuggestion) {
      setFiltros(homiSuggestion.filtros);
      setStep(3);
    }
  };

  const canProceedStep1 = filtros.fontes.length > 0;

  const renderStep1 = () => (
    <div className="space-y-4">
      {homiSuggestion && (
        <HomiInlineSuggestion
          suggestion={homiSuggestion.text}
          actionLabel="✨ Usar essa sugestão"
          onAction={handleUseSuggestion}
        />
      )}

      <p className="text-sm font-medium text-foreground">De onde vêm os leads?</p>
      <div className="grid grid-cols-2 gap-3">
        {FONTES.map(fonte => {
          const Icon = fonte.icon;
          const selected = filtros.fontes.includes(fonte.id);
          const count = fonteCounts?.[fonte.id] ?? "…";
          return (
            <button
              key={fonte.id}
              onClick={() => toggleFonte(fonte.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Icon className={`h-6 w-6 mb-2 ${fonte.color}`} />
              <p className="text-sm font-semibold text-foreground">{fonte.label}</p>
              <p className="text-[10px] text-muted-foreground">{fonte.sub}</p>
              <p className="text-xs text-muted-foreground mt-1">{count} leads</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
      {/* Etapas for leads */}
      {filtros.fontes.includes("meus_leads") && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Por etapa</p>
          <div className="flex flex-wrap gap-1.5">
            {ETAPAS_LEADS.map(e => (
              <ChipToggle
                key={e}
                label={e}
                selected={filtros.etapas?.includes(e) || false}
                onClick={() => toggleArrayFilter("etapas", e)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Etapas for negocios */}
      {filtros.fontes.includes("meus_negocios") && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Etapa do negócio</p>
          <div className="flex flex-wrap gap-1.5">
            {ETAPAS_PDN.map(e => (
              <ChipToggle
                key={e}
                label={e}
                selected={filtros.etapasPdn?.includes(e) || false}
                onClick={() => toggleArrayFilter("etapasPdn", e)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empreendimento */}
      {empreendimentos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Por empreendimento</p>
          <div className="flex flex-wrap gap-1.5">
            {empreendimentos.map(e => (
              <ChipToggle
                key={e}
                label={e}
                selected={filtros.empreendimentos?.includes(e) || false}
                onClick={() => toggleArrayFilter("empreendimentos", e)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tempo sem contato */}
      {(filtros.fontes.includes("meus_leads") || filtros.fontes.includes("meus_negocios")) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Tempo sem contato</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPO_SEM_CONTATO.map(t => (
              <ChipToggle
                key={t.id}
                label={t.label}
                selected={filtros.tempoSemContato === t.id}
                onClick={() => setFiltros(f => ({ ...f, tempoSemContato: t.id }))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Temperatura */}
      {filtros.fontes.includes("meus_leads") && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Por temperatura</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPERATURAS.map(t => (
              <ChipToggle
                key={t.id}
                label={t.label}
                selected={filtros.temperatura?.includes(t.id) || false}
                onClick={() => toggleArrayFilter("temperatura", t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Motivo perda */}
      {filtros.fontes.includes("perdidos") && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Motivo de perda</p>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_PERDA.map(m => (
              <ChipToggle
                key={m.id}
                label={m.label}
                selected={filtros.motivoPerda?.includes(m.id) || false}
                onClick={() => toggleArrayFilter("motivoPerda", m.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">📋 Resumo da lista</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><span className="text-foreground font-medium">Fonte:</span> {filtros.fontes.map(f => FONTES.find(x => x.id === f)?.label).join(", ")}</p>
            {filtros.etapas && filtros.etapas.length > 0 && (
              <p><span className="text-foreground font-medium">Etapas:</span> {filtros.etapas.join(", ")}</p>
            )}
            {filtros.empreendimentos && filtros.empreendimentos.length > 0 && (
              <p><span className="text-foreground font-medium">Produto:</span> {filtros.empreendimentos.join(", ")}</p>
            )}
            {filtros.tempoSemContato && filtros.tempoSemContato !== "qualquer" && (
              <p><span className="text-foreground font-medium">Sem contato:</span> {TEMPO_SEM_CONTATO.find(t => t.id === filtros.tempoSemContato)?.label}</p>
            )}
            {filtros.temperatura && filtros.temperatura.length > 0 && (
              <p><span className="text-foreground font-medium">Temperatura:</span> {filtros.temperatura.join(", ")}</p>
            )}
          </div>

          <div className="pt-2 border-t border-border">
            {resolving ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Calculando...
              </div>
            ) : (
              <p className="text-sm font-bold text-emerald-600">
                ✅ {previewCount ?? 0} leads encontrados
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ordem */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Ordem de prioridade</p>
        <div className="space-y-1.5">
          {ORDENS.map(o => (
            <label key={o.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="radio"
                name="ordem"
                checked={filtros.ordem === o.id}
                onChange={() => setFiltros(f => ({ ...f, ordem: o.id }))}
                className="accent-primary"
              />
              <span className={filtros.ordem === o.id ? "text-foreground font-medium" : "text-muted-foreground"}>
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground">Nome da lista (opcional)</p>
        <Input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Ex: Qualificação Alfa - sem contato"
          className="text-sm"
        />
      </div>
    </div>
  );

  const stepTitles = ["De onde vêm os leads?", "Filtros", "Preview e confirmação"];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar lista personalizada
          </DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  s === step ? "bg-primary text-primary-foreground" :
                  s < step ? "bg-emerald-500 text-white" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {s < step ? "✓" : s}
                </div>
                <span className={`text-xs hidden sm:inline ${s === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {stepTitles[s - 1]}
                </span>
                {s < 3 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        <div className="flex justify-between pt-3 border-t border-border">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !canProceedStep1}
              className="gap-1"
            >
              Próximo <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating || resolving || (previewCount ?? 0) === 0}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flame className="h-3.5 w-3.5" />}
              {creating ? "Criando..." : "Criar e iniciar call"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
