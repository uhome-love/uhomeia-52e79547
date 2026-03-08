import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, Edit, Trash2, Eye, EyeOff, GripVertical, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AcademiaGerenciarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [trilhaDialogOpen, setTrilhaDialogOpen] = useState(false);
  const [aulaDialogOpen, setAulaDialogOpen] = useState(false);
  const [editTrilha, setEditTrilha] = useState<any>(null);
  const [editAula, setEditAula] = useState<any>(null);
  const [selectedTrilhaId, setSelectedTrilhaId] = useState<string | null>(null);

  // Form states
  const [trilhaForm, setTrilhaForm] = useState({ titulo: "", descricao: "", categoria: "vendas", nivel: "iniciante", publicada: true });
  const [aulaForm, setAulaForm] = useState({ titulo: "", descricao: "", tipo: "video", youtube_id: "", conteudo_url: "", duracao_minutos: 10, xp_recompensa: 10, ordem: 1 });

  // Load all trilhas (including unpublished)
  const { data: trilhas = [], isLoading } = useQuery({
    queryKey: ["academia-trilhas-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("academia_trilhas").select("*").order("ordem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Load aulas for selected trilha
  const { data: aulas = [] } = useQuery({
    queryKey: ["academia-aulas-admin", selectedTrilhaId],
    queryFn: async () => {
      if (!selectedTrilhaId) return [];
      const { data, error } = await supabase.from("academia_aulas").select("*").eq("trilha_id", selectedTrilhaId).order("ordem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTrilhaId,
  });

  // Save trilha
  const saveTrilha = useCallback(async () => {
    if (!trilhaForm.titulo.trim()) { toast.error("Título obrigatório"); return; }

    if (editTrilha) {
      await supabase.from("academia_trilhas").update({
        titulo: trilhaForm.titulo,
        descricao: trilhaForm.descricao || null,
        categoria: trilhaForm.categoria,
        nivel: trilhaForm.nivel,
        publicada: trilhaForm.publicada,
      }).eq("id", editTrilha.id);
      toast.success("Trilha atualizada!");
    } else {
      await supabase.from("academia_trilhas").insert({
        titulo: trilhaForm.titulo,
        descricao: trilhaForm.descricao || null,
        categoria: trilhaForm.categoria,
        nivel: trilhaForm.nivel,
        publicada: trilhaForm.publicada,
        criado_por: user?.id,
        ordem: trilhas.length + 1,
      });
      toast.success("Trilha criada!");
    }

    setTrilhaDialogOpen(false);
    setEditTrilha(null);
    setTrilhaForm({ titulo: "", descricao: "", categoria: "vendas", nivel: "iniciante", publicada: true });
    queryClient.invalidateQueries({ queryKey: ["academia-trilhas-admin"] });
  }, [trilhaForm, editTrilha, user, trilhas.length, queryClient]);

  // Save aula
  const saveAula = useCallback(async () => {
    if (!aulaForm.titulo.trim() || !selectedTrilhaId) { toast.error("Título e trilha obrigatórios"); return; }

    const payload = {
      trilha_id: selectedTrilhaId,
      titulo: aulaForm.titulo,
      descricao: aulaForm.descricao || null,
      tipo: aulaForm.tipo,
      youtube_id: aulaForm.youtube_id || null,
      conteudo_url: aulaForm.conteudo_url || null,
      duracao_minutos: aulaForm.duracao_minutos || null,
      xp_recompensa: aulaForm.xp_recompensa || 10,
      ordem: aulaForm.ordem,
    };

    if (editAula) {
      await supabase.from("academia_aulas").update(payload).eq("id", editAula.id);
      toast.success("Aula atualizada!");
    } else {
      await supabase.from("academia_aulas").insert(payload);
      toast.success("Aula criada!");
    }

    setAulaDialogOpen(false);
    setEditAula(null);
    setAulaForm({ titulo: "", descricao: "", tipo: "video", youtube_id: "", conteudo_url: "", duracao_minutos: 10, xp_recompensa: 10, ordem: aulas.length + 1 });
    queryClient.invalidateQueries({ queryKey: ["academia-aulas-admin"] });
    // Update trilha XP total
    const { data: aulaList } = await supabase.from("academia_aulas").select("xp_recompensa").eq("trilha_id", selectedTrilhaId);
    const totalXp = (aulaList || []).reduce((sum: number, a: any) => sum + (a.xp_recompensa || 0), 0);
    await supabase.from("academia_trilhas").update({ xp_total: totalXp }).eq("id", selectedTrilhaId);
  }, [aulaForm, editAula, selectedTrilhaId, aulas.length, queryClient]);

  const deleteTrilha = async (id: string) => {
    if (!confirm("Excluir trilha e todas as aulas?")) return;
    await supabase.from("academia_aulas").delete().eq("trilha_id", id);
    await supabase.from("academia_trilhas").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["academia-trilhas-admin"] });
    if (selectedTrilhaId === id) setSelectedTrilhaId(null);
    toast.success("Trilha excluída");
  };

  const deleteAula = async (id: string) => {
    if (!confirm("Excluir aula?")) return;
    await supabase.from("academia_aulas").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["academia-aulas-admin"] });
    toast.success("Aula excluída");
  };

  const togglePublicada = async (trilha: any) => {
    await supabase.from("academia_trilhas").update({ publicada: !trilha.publicada }).eq("id", trilha.id);
    queryClient.invalidateQueries({ queryKey: ["academia-trilhas-admin"] });
    toast.success(trilha.publicada ? "Trilha despublicada" : "Trilha publicada");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/academia")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">🎓 Gerenciar Academia</h1>
        <div className="ml-auto">
          <Button onClick={() => { setEditTrilha(null); setTrilhaForm({ titulo: "", descricao: "", categoria: "vendas", nivel: "iniciante", publicada: true }); setTrilhaDialogOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova Trilha
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Trilhas list */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground px-1">Trilhas ({trilhas.length})</h3>
          {trilhas.map((t: any) => (
            <button
              key={t.id}
              onClick={() => setSelectedTrilhaId(t.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedTrilhaId === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium truncate flex-1">{t.titulo}</span>
                {!t.publicada && <EyeOff className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{t.categoria || "geral"}</Badge>
                <Badge variant="secondary" className="text-[10px]">{t.nivel || "iniciante"}</Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">{t.xp_total || 0} XP</span>
              </div>
              <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => {
                  setEditTrilha(t);
                  setTrilhaForm({ titulo: t.titulo, descricao: t.descricao || "", categoria: t.categoria || "vendas", nivel: t.nivel || "iniciante", publicada: t.publicada ?? true });
                  setTrilhaDialogOpen(true);
                }}><Edit className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => togglePublicada(t)}>
                  {t.publicada ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-destructive" onClick={() => deleteTrilha(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </button>
          ))}
        </div>

        {/* Aulas for selected trilha */}
        <div className="md:col-span-2">
          {selectedTrilhaId ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Aulas ({aulas.length})</h3>
                <Button size="sm" onClick={() => {
                  setEditAula(null);
                  setAulaForm({ titulo: "", descricao: "", tipo: "video", youtube_id: "", conteudo_url: "", duracao_minutos: 10, xp_recompensa: 10, ordem: aulas.length + 1 });
                  setAulaDialogOpen(true);
                }} className="gap-1"><Plus className="h-3 w-3" /> Aula</Button>
              </div>
              {aulas.map((a: any, idx: number) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <span className="text-xs text-muted-foreground font-bold w-6">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{a.titulo}</span>
                      <Badge variant="secondary" className="text-[9px]">{a.tipo}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{a.duracao_minutos}min · {a.xp_recompensa} XP</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => {
                    setEditAula(a);
                    setAulaForm({
                      titulo: a.titulo, descricao: a.descricao || "", tipo: a.tipo,
                      youtube_id: a.youtube_id || "", conteudo_url: a.conteudo_url || "",
                      duracao_minutos: a.duracao_minutos || 10, xp_recompensa: a.xp_recompensa || 10,
                      ordem: a.ordem || idx + 1,
                    });
                    setAulaDialogOpen(true);
                  }}><Edit className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive" onClick={() => deleteAula(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {aulas.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Nenhuma aula. Clique em "+ Aula" para criar.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground text-sm">
              Selecione uma trilha à esquerda para gerenciar suas aulas.
            </div>
          )}
        </div>
      </div>

      {/* Trilha Dialog */}
      <Dialog open={trilhaDialogOpen} onOpenChange={setTrilhaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTrilha ? "Editar Trilha" : "Nova Trilha"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={trilhaForm.titulo} onChange={e => setTrilhaForm(p => ({ ...p, titulo: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={trilhaForm.descricao} onChange={e => setTrilhaForm(p => ({ ...p, descricao: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label>
                <Select value={trilhaForm.categoria} onValueChange={v => setTrilhaForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="mindset">Mindset</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nível</Label>
                <Select value={trilhaForm.nivel} onValueChange={v => setTrilhaForm(p => ({ ...p, nivel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={trilhaForm.publicada} onCheckedChange={v => setTrilhaForm(p => ({ ...p, publicada: v }))} />
              <Label>Publicada</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={saveTrilha}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aula Dialog */}
      <Dialog open={aulaDialogOpen} onOpenChange={setAulaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editAula ? "Editar Aula" : "Nova Aula"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={aulaForm.titulo} onChange={e => setAulaForm(p => ({ ...p, titulo: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={aulaForm.descricao} onChange={e => setAulaForm(p => ({ ...p, descricao: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <Select value={aulaForm.tipo} onValueChange={v => setAulaForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">🎬 Vídeo</SelectItem>
                    <SelectItem value="pdf">📄 PDF</SelectItem>
                    <SelectItem value="quiz">🧠 Quiz</SelectItem>
                    <SelectItem value="checklist">✅ Checklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ordem</Label><Input type="number" value={aulaForm.ordem} onChange={e => setAulaForm(p => ({ ...p, ordem: parseInt(e.target.value) || 1 }))} /></div>
            </div>
            {aulaForm.tipo === "video" && (
              <div><Label>YouTube ID</Label><Input value={aulaForm.youtube_id} onChange={e => setAulaForm(p => ({ ...p, youtube_id: e.target.value }))} placeholder="ex: dQw4w9WgXcQ" /></div>
            )}
            {(aulaForm.tipo === "pdf" || aulaForm.tipo === "video") && (
              <div><Label>URL do conteúdo</Label><Input value={aulaForm.conteudo_url} onChange={e => setAulaForm(p => ({ ...p, conteudo_url: e.target.value }))} placeholder="https://..." /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duração (min)</Label><Input type="number" value={aulaForm.duracao_minutos} onChange={e => setAulaForm(p => ({ ...p, duracao_minutos: parseInt(e.target.value) || 10 }))} /></div>
              <div><Label>XP Recompensa</Label><Input type="number" value={aulaForm.xp_recompensa} onChange={e => setAulaForm(p => ({ ...p, xp_recompensa: parseInt(e.target.value) || 10 }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveAula}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
