import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CheckCircle2, AlertTriangle, RefreshCw, Database, Building2, Users, Zap, Pencil, Save, X, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// ── Types ──
interface FieldMapping {
  id: string;
  categoria: string;
  jetimob_field: string;
  jetimob_description: string | null;
  uhome_field: string;
  uhome_table: string;
  transform: string | null;
  status: string;
  notes: string | null;
  ativo: boolean;
  ordem: number;
}

// ── Empreendimento mappings (from normalizeEmpreendimento in jetimob-sync) ──
const EMPREENDIMENTO_MAPPINGS = [
  { jetimobName: "Casa Tua", uhomeName: "Casa Tua", segmento: "Altíssimo" },
  { jetimobName: "Orygem", uhomeName: "Orygem", segmento: "Médio-Alto" },
  { jetimobName: "Lake Eyre", uhomeName: "Lake Eyre", segmento: "Altíssimo" },
  { jetimobName: "Open Bosque", uhomeName: "Open Bosque", segmento: "Médio-Alto" },
  { jetimobName: "Casa Bastian", uhomeName: "Casa Bastian", segmento: "Altíssimo" },
  { jetimobName: "Shift", uhomeName: "Shift", segmento: "Médio-Alto" },
  { jetimobName: "Seen Menino Deus", uhomeName: "Seen Menino Deus", segmento: "Médio-Alto" },
  { jetimobName: "Botanique", uhomeName: "Botanique", segmento: "Altíssimo" },
  { jetimobName: "Me Day", uhomeName: "Me Day", segmento: "MCMV" },
  { jetimobName: "Melnick Day", uhomeName: "Melnick Day", segmento: "MCMV" },
  { jetimobName: "Go Carlos Bosque", uhomeName: "Go Carlos Bosque", segmento: "Médio-Alto" },
  { jetimobName: "Go Carlos Gomes", uhomeName: "Go Carlos Gomes", segmento: "Médio-Alto" },
  { jetimobName: "Vista Menino Deus", uhomeName: "Vista Menino Deus", segmento: "Médio-Alto" },
  { jetimobName: "Nilo Square", uhomeName: "Nilo Square", segmento: "Médio-Alto" },
  { jetimobName: "High Garden Iguatemi", uhomeName: "High Garden Iguatemi", segmento: "Altíssimo" },
  { jetimobName: "High Garden Rio Branco", uhomeName: "High Garden Rio Branco", segmento: "Altíssimo" },
  { jetimobName: "Las Casas (Vértice)", uhomeName: "Las Casas", segmento: "Altíssimo" },
  { jetimobName: "Essenza Club", uhomeName: "Essenza Club", segmento: "Médio-Alto" },
  { jetimobName: "Prime Wish", uhomeName: "Prime Wish", segmento: "Altíssimo" },
  { jetimobName: "Alto Lindóia", uhomeName: "Alto Lindóia", segmento: "MCMV" },
  { jetimobName: "San Andreas", uhomeName: "San Andreas", segmento: "Médio-Alto" },
  { jetimobName: "Supreme", uhomeName: "Supreme", segmento: "Altíssimo" },
  { jetimobName: "Boa Vista Country Club", uhomeName: "Boa Vista Country Club", segmento: "Altíssimo" },
  { jetimobName: "Pontal", uhomeName: "Pontal", segmento: "Médio-Alto" },
  { jetimobName: "Alfa", uhomeName: "Alfa", segmento: "Médio-Alto" },
  { jetimobName: "Avulso Canoas", uhomeName: "Avulso Canoas", segmento: "MCMV" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <AlertTriangle className="h-4 w-4 text-destructive" />;
}

// ── Editable Row ──
function EditableRow({ mapping, onSave, onDelete }: { mapping: FieldMapping; onSave: (m: FieldMapping) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mapping);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(mapping);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="border-b bg-primary/5">
        <td className="px-3 py-2">
          <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ok">✅ Mapeado</SelectItem>
              <SelectItem value="warning">⚠️ Parcial</SelectItem>
              <SelectItem value="missing">❌ Pendente</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2">
          <Input className="h-8 text-xs font-mono" value={draft.jetimob_field} onChange={(e) => setDraft({ ...draft, jetimob_field: e.target.value })} />
          <Input className="h-7 text-xs mt-1" placeholder="Descrição" value={draft.jetimob_description || ""} onChange={(e) => setDraft({ ...draft, jetimob_description: e.target.value })} />
        </td>
        <td className="px-3 py-2"><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
        <td className="px-3 py-2">
          <Input className="h-8 text-xs font-mono" value={draft.uhome_field} onChange={(e) => setDraft({ ...draft, uhome_field: e.target.value })} />
        </td>
        <td className="px-3 py-2">
          <Input className="h-8 text-xs" value={draft.uhome_table} onChange={(e) => setDraft({ ...draft, uhome_table: e.target.value })} />
        </td>
        <td className="px-3 py-2">
          <Input className="h-8 text-xs" placeholder="Transformação" value={draft.transform || ""} onChange={(e) => setDraft({ ...draft, transform: e.target.value || null })} />
        </td>
        <td className="px-3 py-2">
          <Input className="h-8 text-xs" placeholder="Notas" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })} />
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}><Save className="h-3.5 w-3.5 text-green-600" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b last:border-0 group ${mapping.status === "missing" ? "bg-destructive/5" : mapping.status === "warning" ? "bg-amber-500/5" : ""}`}>
      <td className="px-3 py-2.5"><StatusIcon status={mapping.status} /></td>
      <td className="px-3 py-2.5">
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{mapping.jetimob_field}</span>
        {mapping.jetimob_description && <p className="text-xs text-muted-foreground mt-0.5">{mapping.jetimob_description}</p>}
      </td>
      <td className="px-3 py-2.5"><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
      <td className="px-3 py-2.5">
        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${mapping.status === "missing" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {mapping.uhome_field}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{mapping.uhome_table}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">{mapping.transform || "—"}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[160px]">{mapping.notes || "—"}</td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(mapping.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );
}

// ── Editable Mapping Table ──
function EditableFieldMappingTable({ categoria, title }: { categoria: string; title: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ jetimob_field: "", jetimob_description: "", uhome_field: "", uhome_table: "pipeline_leads", transform: "", notes: "", status: "missing" });

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ["integracao-mappings", categoria],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integracao_field_mappings")
        .select("*")
        .eq("categoria", categoria)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as FieldMapping[];
    },
  });

  const handleSave = useCallback(async (m: FieldMapping) => {
    const { error } = await supabase
      .from("integracao_field_mappings")
      .update({
        jetimob_field: m.jetimob_field,
        jetimob_description: m.jetimob_description,
        uhome_field: m.uhome_field,
        uhome_table: m.uhome_table,
        transform: m.transform,
        status: m.status,
        notes: m.notes,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      })
      .eq("id", m.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Campo atualizado!");
      queryClient.invalidateQueries({ queryKey: ["integracao-mappings", categoria] });
    }
  }, [user, categoria, queryClient]);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("integracao_field_mappings")
      .update({ ativo: false, updated_by: user?.id })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      toast.success("Campo removido");
      queryClient.invalidateQueries({ queryKey: ["integracao-mappings", categoria] });
    }
  }, [user, categoria, queryClient]);

  const handleAddNew = useCallback(async () => {
    if (!newRow.jetimob_field) { toast.error("Campo Jetimob é obrigatório"); return; }
    const { error } = await supabase
      .from("integracao_field_mappings")
      .insert({
        categoria,
        jetimob_field: newRow.jetimob_field,
        jetimob_description: newRow.jetimob_description || null,
        uhome_field: newRow.uhome_field || "(não mapeado)",
        uhome_table: newRow.uhome_table || "—",
        transform: newRow.transform || null,
        notes: newRow.notes || null,
        status: newRow.status,
        ordem: (mappings.length + 1) * 10,
        updated_by: user?.id,
      });
    if (error) {
      toast.error("Erro ao adicionar: " + error.message);
    } else {
      toast.success("Novo campo adicionado!");
      setAdding(false);
      setNewRow({ jetimob_field: "", jetimob_description: "", uhome_field: "", uhome_table: "pipeline_leads", transform: "", notes: "", status: "missing" });
      queryClient.invalidateQueries({ queryKey: ["integracao-mappings", categoria] });
    }
  }, [newRow, categoria, user, mappings.length, queryClient]);

  const okCount = mappings.filter(m => m.status === "ok").length;
  const warnCount = mappings.filter(m => m.status === "warning").length;
  const missCount = mappings.filter(m => m.status === "missing").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-2 text-xs">
              <Badge variant="default" className="bg-green-600">{okCount} mapeados</Badge>
              {warnCount > 0 && <Badge variant="secondary">{warnCount} parciais</Badge>}
              {missCount > 0 && <Badge variant="destructive">{missCount} pendentes</Badge>}
            </div>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setAdding(!adding)}>
              <Plus className="h-3.5 w-3.5" /> Novo Campo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando mapeamentos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-20">Status</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Campo Jetimob</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-8"><ArrowRight className="h-3.5 w-3.5" /></th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Campo uHome</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Tabela</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Transformação</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Notas</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {adding && (
                  <tr className="border-b bg-accent/10">
                    <td className="px-3 py-2">
                      <Select value={newRow.status} onValueChange={(v) => setNewRow({ ...newRow, status: v })}>
                        <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ok">✅ Mapeado</SelectItem>
                          <SelectItem value="warning">⚠️ Parcial</SelectItem>
                          <SelectItem value="missing">❌ Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input className="h-8 text-xs font-mono" placeholder="Campo Jetimob" value={newRow.jetimob_field} onChange={(e) => setNewRow({ ...newRow, jetimob_field: e.target.value })} />
                      <Input className="h-7 text-xs mt-1" placeholder="Descrição" value={newRow.jetimob_description} onChange={(e) => setNewRow({ ...newRow, jetimob_description: e.target.value })} />
                    </td>
                    <td className="px-3 py-2"><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
                    <td className="px-3 py-2"><Input className="h-8 text-xs font-mono" placeholder="Campo uHome" value={newRow.uhome_field} onChange={(e) => setNewRow({ ...newRow, uhome_field: e.target.value })} /></td>
                    <td className="px-3 py-2"><Input className="h-8 text-xs" placeholder="Tabela" value={newRow.uhome_table} onChange={(e) => setNewRow({ ...newRow, uhome_table: e.target.value })} /></td>
                    <td className="px-3 py-2"><Input className="h-8 text-xs" placeholder="Transformação" value={newRow.transform} onChange={(e) => setNewRow({ ...newRow, transform: e.target.value })} /></td>
                    <td className="px-3 py-2"><Input className="h-8 text-xs" placeholder="Notas" value={newRow.notes} onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })} /></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddNew}><Save className="h-3.5 w-3.5 text-green-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAdding(false)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                )}
                {mappings.map((m) => (
                  <EditableRow key={m.id} mapping={m} onSave={handleSave} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegracaoJetimob() {
  const [syncing, setSyncing] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["integracao-stats"],
    queryFn: async () => {
      const [leadsRes, processedRes, campanhasRes] = await Promise.all([
        supabase.from("pipeline_leads").select("id", { count: "exact", head: true }).not("jetimob_lead_id", "is", null),
        supabase.from("jetimob_processed").select("jetimob_lead_id", { count: "exact", head: true }),
        supabase.from("roleta_campanhas").select("id", { count: "exact", head: true }).eq("ativo", true),
      ]);
      return {
        leadsAtivos: leadsRes.count ?? 0,
        leadsProcessados: processedRes.count ?? 0,
        campanhasAtivas: campanhasRes.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  const { data: leadMappings = [] } = useQuery({
    queryKey: ["integracao-mappings", "leads"],
    queryFn: async () => {
      const { data } = await supabase.from("integracao_field_mappings").select("status").eq("categoria", "leads").eq("ativo", true);
      return data || [];
    },
  });
  const { data: imovelMappings = [] } = useQuery({
    queryKey: ["integracao-mappings-count", "imoveis"],
    queryFn: async () => {
      const { data } = await supabase.from("integracao_field_mappings").select("status").eq("categoria", "imoveis").eq("ativo", true);
      return data || [];
    },
  });

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("jetimob-sync", { body: {} });
      if (error) throw error;
      toast.success(`Sync concluído: ${data?.synced ?? 0} novos, ${data?.skipped ?? 0} ignorados`);
    } catch (err: any) {
      toast.error("Erro no sync: " + (err.message || "desconhecido"));
    } finally {
      setSyncing(false);
    }
  };

  const leadOk = leadMappings.filter((m: any) => m.status === "ok").length;
  const leadTotal = leadMappings.length;
  const imovelOk = imovelMappings.filter((m: any) => m.status === "ok").length;
  const imovelTotal = imovelMappings.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Integração Jetimob ↔ uHome Sales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mapeamento editável de campos — clique no lápis para alterar qualquer campo
          </p>
        </div>
        <Button onClick={handleManualSync} disabled={syncing} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sync Manual"}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{stats?.leadsAtivos ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Leads Jetimob ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="rounded-lg bg-green-500/10 p-2.5"><Database className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{stats?.leadsProcessados ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Leads processados (dedup)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="rounded-lg bg-amber-500/10 p-2.5"><Building2 className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{stats?.campanhasAtivas ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Campanhas / Empreendimentos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Leads ({leadOk}/{leadTotal})</TabsTrigger>
          <TabsTrigger value="imoveis" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Imóveis ({imovelOk}/{imovelTotal})</TabsTrigger>
          <TabsTrigger value="empreendimentos" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Empreendimentos ({EMPREENDIMENTO_MAPPINGS.length})</TabsTrigger>
          <TabsTrigger value="dedup" className="gap-1.5"><Database className="h-3.5 w-3.5" /> Deduplicação</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <EditableFieldMappingTable categoria="leads" title="Mapeamento de Leads — Jetimob → pipeline_leads" />
        </TabsContent>

        <TabsContent value="imoveis">
          <EditableFieldMappingTable categoria="imoveis" title="Mapeamento de Imóveis — Jetimob API → jetimob-proxy" />
        </TabsContent>

        <TabsContent value="empreendimentos">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Normalização de Empreendimentos</CardTitle>
              <CardDescription>Como nomes de campanha do Jetimob são traduzidos para empreendimentos no uHome</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nome Jetimob</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-8"><ArrowRight className="h-3.5 w-3.5" /></th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Nome uHome</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Segmento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EMPREENDIMENTO_MAPPINGS.map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs">{e.jetimobName}</td>
                        <td className="px-4 py-2.5"><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
                        <td className="px-4 py-2.5 font-medium">{e.uhomeName}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={e.segmento === "MCMV" ? "default" : e.segmento === "Altíssimo" ? "secondary" : "outline"}>
                            {e.segmento}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dedup">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sistema de Deduplicação</CardTitle>
              <CardDescription>Como o uHome evita leads duplicados vindos do Jetimob</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Camada 1 — jetimob_lead_id</h4>
                  <p className="text-xs text-muted-foreground">
                    ID composto: <code className="bg-muted px-1 rounded">phone_campaignId_createdAt</code>. Mesmo formulário + mesmo lead = skip silencioso.
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Camada 2 — Telefone</h4>
                  <p className="text-xs text-muted-foreground">
                    Mesmo telefone, novo formulário = lead reativado. Notifica o corretor dono e cria tarefa SLA 2h. Não entra na roleta novamente.
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Camada 3 — jetimob_processed</h4>
                  <p className="text-xs text-muted-foreground">
                    Tabela permanente que registra todos os jetimob_lead_id + telefone já processados. Protege contra reentrada mesmo após exclusão de leads.
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Camada 4 — CUTOFF date</h4>
                  <p className="text-xs text-muted-foreground">
                    Apenas leads criados a partir de <code className="bg-muted px-1 rounded">2026-03-07</code> são importados. Impede histórico antigo de invadir o pipeline.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 border p-4 mt-4">
                <h4 className="font-semibold text-sm mb-2">Fluxo de Processamento</h4>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">API Jetimob</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">Filtro Cutoff</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">Dedup (ID + Phone + Processed)</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">extractCampanha()</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">normalizeEmpreendimento()</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">resolveSegmentoId()</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline">INSERT pipeline_leads</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="default">distribute-lead</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
