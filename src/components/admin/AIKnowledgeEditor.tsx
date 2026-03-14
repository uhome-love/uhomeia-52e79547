/**
 * AIKnowledgeEditor — Modal for managing AI-specific knowledge fields
 * on empreendimento_overrides. Shows completeness and fallback indicators.
 */
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X, Brain, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/* ─── Types ─── */

type Objecao = { objecao: string; resposta: string };

export type AIKnowledgeData = {
  descricao_completa: string | null;
  objecoes: Objecao[] | null;
  estrategia_conversao: string | null;
  perfil_cliente: string | null;
  argumentos_venda: string | null;
  segmento_comercial: string | null;
  hashtags: string[] | null;
};

const AI_FIELDS: Array<{ key: keyof AIKnowledgeData; label: string; weight: number }> = [
  { key: "descricao_completa", label: "Descrição Completa (IA)", weight: 25 },
  { key: "objecoes", label: "Objeções e Respostas", weight: 20 },
  { key: "estrategia_conversao", label: "Estratégia de Conversão", weight: 15 },
  { key: "perfil_cliente", label: "Perfil do Cliente Ideal", weight: 15 },
  { key: "argumentos_venda", label: "Argumentos de Venda", weight: 10 },
  { key: "segmento_comercial", label: "Segmento Comercial", weight: 10 },
  { key: "hashtags", label: "Hashtags", weight: 5 },
];

/* ─── Completeness Scoring ─── */

export function computeAICompleteness(data: AIKnowledgeData | null): {
  score: number;
  filledCount: number;
  totalCount: number;
  missing: string[];
} {
  if (!data) return { score: 0, filledCount: 0, totalCount: AI_FIELDS.length, missing: AI_FIELDS.map(f => f.label) };

  let totalWeight = 0;
  let filledWeight = 0;
  let filledCount = 0;
  const missing: string[] = [];

  for (const field of AI_FIELDS) {
    totalWeight += field.weight;
    const val = data[field.key];
    const isFilled = val !== null && val !== undefined &&
      (typeof val === "string" ? val.trim().length > 0 : Array.isArray(val) ? val.length > 0 : true);

    if (isFilled) {
      filledWeight += field.weight;
      filledCount++;
    } else {
      missing.push(field.label);
    }
  }

  return {
    score: totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0,
    filledCount,
    totalCount: AI_FIELDS.length,
    missing,
  };
}

export function AICompletenessBadge({ data, compact = false }: { data: AIKnowledgeData | null; compact?: boolean }) {
  const { score, filledCount, totalCount } = computeAICompleteness(data);

  const color = score === 0
    ? "bg-muted/50 text-muted-foreground border-border/50"
    : score < 50
      ? "bg-amber-500/15 text-amber-600 border-amber-400/30"
      : score < 100
        ? "bg-blue-500/15 text-blue-600 border-blue-400/30"
        : "bg-emerald-500/15 text-emerald-600 border-emerald-400/30";

  const icon = score === 100
    ? <CheckCircle2 className="h-3 w-3" />
    : score === 0
      ? <AlertTriangle className="h-3 w-3" />
      : <Brain className="h-3 w-3" />;

  if (compact) {
    return (
      <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0.5 gap-0.5 font-bold", color)}>
        {icon} {score}%
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("text-[9px] px-2 py-0.5 gap-1 font-bold", color)}>
      {icon}
      IA {filledCount}/{totalCount}
      {score === 0 && " (fallback)"}
      {score === 100 && " ✓"}
    </Badge>
  );
}

/* ─── Editor Modal ─── */

const SEGMENTOS_OPTIONS = [
  { value: "mcmv", label: "MCMV (até 500k)" },
  { value: "medio_alto", label: "Médio-Alto" },
  { value: "altissimo", label: "Altíssimo Padrão" },
  { value: "investimento", label: "Investimento" },
  { value: "evento", label: "Evento" },
];

export function AIKnowledgeEditorModal({
  open,
  onOpenChange,
  codigo,
  nome,
  overrideId,
  initialData,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  codigo: string;
  nome: string;
  overrideId: string | null;
  initialData: AIKnowledgeData | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  // Form state
  const [descricaoCompleta, setDescricaoCompleta] = useState("");
  const [objecoes, setObjecoes] = useState<Objecao[]>([]);
  const [estrategia, setEstrategia] = useState("");
  const [perfil, setPerfil] = useState("");
  const [argumentos, setArgumentos] = useState("");
  const [segmento, setSegmento] = useState("");
  const [hashtagsText, setHashtagsText] = useState("");

  useEffect(() => {
    if (open) {
      setDescricaoCompleta(initialData?.descricao_completa || "");
      setObjecoes(initialData?.objecoes?.length ? initialData.objecoes : [{ objecao: "", resposta: "" }]);
      setEstrategia(initialData?.estrategia_conversao || "");
      setPerfil(initialData?.perfil_cliente || "");
      setArgumentos(initialData?.argumentos_venda || "");
      setSegmento(initialData?.segmento_comercial || "");
      setHashtagsText(initialData?.hashtags?.join(", ") || "");
    }
  }, [open, initialData]);

  // Live completeness
  const liveData: AIKnowledgeData = {
    descricao_completa: descricaoCompleta || null,
    objecoes: objecoes.filter(o => o.objecao.trim() && o.resposta.trim()),
    estrategia_conversao: estrategia || null,
    perfil_cliente: perfil || null,
    argumentos_venda: argumentos || null,
    segmento_comercial: segmento || null,
    hashtags: hashtagsText.split(",").map(h => h.trim()).filter(Boolean),
  };
  const { score } = computeAICompleteness(liveData);

  async function handleSave() {
    setSaving(true);
    try {
      const cleanObjecoes = objecoes.filter(o => o.objecao.trim() && o.resposta.trim());
      const cleanHashtags = hashtagsText.split(",").map(h => h.trim()).filter(Boolean);

      const payload: Record<string, unknown> = {
        descricao_completa: descricaoCompleta.trim() || null,
        objecoes: cleanObjecoes.length > 0 ? cleanObjecoes : null,
        estrategia_conversao: estrategia.trim() || null,
        perfil_cliente: perfil.trim() || null,
        argumentos_venda: argumentos.trim() || null,
        segmento_comercial: segmento || null,
        hashtags: cleanHashtags.length > 0 ? cleanHashtags : null,
        updated_at: new Date().toISOString(),
      };

      if (overrideId) {
        const { error } = await supabase
          .from("empreendimento_overrides")
          .update(payload as any)
          .eq("id", overrideId);
        if (error) throw error;
      } else {
        // Create new override record with AI fields
        const { error } = await supabase
          .from("empreendimento_overrides")
          .upsert({ ...payload, codigo, nome } as any, { onConflict: "codigo" });
        if (error) throw error;
      }

      toast.success("Conhecimento IA salvo com sucesso!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Falha"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Conhecimento IA — {nome}
            <AICompletenessBadge data={liveData} />
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Estes campos alimentam os assistentes HOMI. Campos vazios usam fallback hardcoded.
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Segmento Comercial */}
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              Segmento Comercial
              {!segmento && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-400/30">fallback</Badge>}
            </Label>
            <Select value={segmento} onValueChange={setSegmento}>
              <SelectTrigger className="h-9 text-sm mt-1">
                <SelectValue placeholder="Selecione o segmento..." />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTOS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição Completa */}
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              Descrição Completa para IA
              {!descricaoCompleta.trim() && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-400/30">fallback</Badge>}
            </Label>
            <p className="text-[10px] text-muted-foreground mb-1">
              Texto narrativo completo usado pelos assistentes. Inclua conceito, localização, construtora, tipologias, lazer, diferenciais.
            </p>
            <Textarea
              value={descricaoCompleta}
              onChange={e => setDescricaoCompleta(e.target.value)}
              rows={6}
              placeholder="EMPREENDIMENTO: Nome&#10;CONSTRUTORA: ...&#10;LOCALIZAÇÃO: ...&#10;CONCEITO: ...&#10;TIPOLOGIAS: ...&#10;LAZER: ...&#10;DIFERENCIAIS: ..."
              className="text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {descricaoCompleta.length} caracteres
            </p>
          </div>

          {/* Perfil do Cliente */}
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              Perfil do Cliente Ideal
              {!perfil.trim() && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-400/30">fallback</Badge>}
            </Label>
            <Textarea
              value={perfil}
              onChange={e => setPerfil(e.target.value)}
              rows={2}
              placeholder="Ex: Famílias que querem sair do apartamento, buscam mais espaço, valorizam segurança..."
              className="text-sm"
            />
          </div>

          {/* Objeções */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                Objeções e Respostas
                {objecoes.filter(o => o.objecao.trim() && o.resposta.trim()).length === 0 &&
                  <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-400/30">fallback</Badge>
                }
              </Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setObjecoes(prev => [...prev, { objecao: "", resposta: "" }])}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
            {objecoes.map((obj, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start rounded-lg border border-border/50 p-2.5 bg-muted/20">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Objeção do cliente</Label>
                  <Input
                    value={obj.objecao}
                    onChange={e => {
                      const updated = [...objecoes];
                      updated[idx] = { ...updated[idx], objecao: e.target.value };
                      setObjecoes(updated);
                    }}
                    placeholder='"Localização afastada"'
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Resposta sugerida</Label>
                  <Input
                    value={obj.resposta}
                    onChange={e => {
                      const updated = [...objecoes];
                      updated[idx] = { ...updated[idx], resposta: e.target.value };
                      setObjecoes(updated);
                    }}
                    placeholder="Comparar com qualidade de vida..."
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setObjecoes(prev => prev.filter((_, i) => i !== idx))}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive mt-4"
                  disabled={objecoes.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Argumentos de Venda */}
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              Argumentos de Venda
              {!argumentos.trim() && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-400/30">fallback</Badge>}
            </Label>
            <Textarea
              value={argumentos}
              onChange={e => setArgumentos(e.target.value)}
              rows={2}
              placeholder="Morar em casa com segurança de condomínio, mais espaço para família, pátio para lazer..."
              className="text-sm"
            />
          </div>

          {/* Estratégia de Conversão */}
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              Estratégia de Conversão
              {!estrategia.trim() && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-400/30">fallback</Badge>}
            </Label>
            <Textarea
              value={estrategia}
              onChange={e => setEstrategia(e.target.value)}
              rows={2}
              placeholder="1) Entender perfil. 2) Explicar conceito. 3) Mostrar diferenciais. 4) Convidar para visita."
              className="text-sm"
            />
          </div>

          {/* Hashtags */}
          <div>
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              Hashtags (separadas por vírgula)
              {!hashtagsText.trim() && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-400/30">fallback</Badge>}
            </Label>
            <Input
              value={hashtagsText}
              onChange={e => setHashtagsText(e.target.value)}
              placeholder="#CasaTua, #SeuNovoLar, #UhomePOA"
              className="h-9 text-sm"
            />
          </div>

          {/* Completeness Progress */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-primary" />
                Completude do Conhecimento IA
              </p>
              <span className={cn(
                "text-sm font-black",
                score === 100 ? "text-emerald-600" : score >= 50 ? "text-blue-600" : "text-amber-600"
              )}>
                {score}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  score === 100 ? "bg-emerald-500" : score >= 50 ? "bg-blue-500" : "bg-amber-500"
                )}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {score === 100
                ? "✅ Todos os campos preenchidos — assistentes usam 100% dados do banco."
                : score === 0
                  ? "⚠️ Nenhum campo preenchido — assistentes usam fallback hardcoded."
                  : `Campos vazios usam fallback hardcoded. Preencha para melhorar a precisão dos assistentes.`
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar Conhecimento IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
