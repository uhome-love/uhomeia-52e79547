import { useState } from "react";
import { usePagadorias, useComissaoFaixas } from "@/hooks/useBackofficeData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Search, FileText, Eye, Link, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-neutral-500" },
  pendente: { label: "Pendente", color: "bg-amber-500" },
  aguardando_assinatura: { label: "⏳ Aguard. Assinatura", color: "bg-blue-500" },
  assinada: { label: "✅ Assinada", color: "bg-green-500" },
  paga: { label: "💰 Paga", color: "bg-emerald-600" },
};

interface Credor {
  credor_tipo: string;
  credor_nome: string;
  credor_id: string | null;
  percentual: number;
  valor: number;
}

const DEFAULT_CREDORES: Credor[] = [
  { credor_tipo: "corretor", credor_nome: "", credor_id: null, percentual: 32, valor: 0 },
  { credor_tipo: "parceiro", credor_nome: "", credor_id: null, percentual: 0, valor: 0 },
  { credor_tipo: "diretoria", credor_nome: "Diretoria", credor_id: null, percentual: 5, valor: 0 },
  { credor_tipo: "socio", credor_nome: "Gabrielle", credor_id: null, percentual: 5, valor: 0 },
  { credor_tipo: "socio", credor_nome: "Lucas", credor_id: null, percentual: 5, valor: 0 },
  { credor_tipo: "marketing", credor_nome: "Ana Mkt", credor_id: null, percentual: 1, valor: 0 },
  { credor_tipo: "uhome", credor_nome: "UHome", credor_id: null, percentual: 0, valor: 0 },
];

export default function PagadoriasPage() {
  const { user } = useAuth();
  const { pagadorias, isLoading, createPagadoria } = usePagadorias();
  const { faixas, getFaixaForVgv } = useComissaoFaixas();
  const [filter, setFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Wizard form state
  const [form, setForm] = useState({
    cliente_nome: "", cliente_cpf: "", cliente_email: "", cliente_telefone: "", cliente_endereco: "",
    empreendimento: "", unidade: "", vgv: 0, data_venda: new Date().toISOString().slice(0, 10),
    forma_pagamento: "a_vista",
  });
  const [credores, setCredores] = useState<Credor[]>(DEFAULT_CREDORES);

  const filtered = pagadorias.filter((p: any) => {
    if (filter !== "todas" && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.cliente_nome?.toLowerCase().includes(q) || p.empreendimento?.toLowerCase().includes(q);
    }
    return true;
  });

  const recalcCredores = (vgv: number, creds: Credor[]) => {
    const totalPctFixed = creds.slice(0, -1).reduce((s, c) => s + c.percentual, 0);
    return creds.map((c, i) => {
      if (i === creds.length - 1) {
        // UHome = remainder
        const pct = Math.max(0, 100 - totalPctFixed);
        return { ...c, percentual: pct, valor: Math.round((pct / 100) * vgv * 100) / 100 };
      }
      return { ...c, valor: Math.round((c.percentual / 100) * vgv * 100) / 100 };
    });
  };

  const handleVgvChange = (vgv: number) => {
    setForm(prev => ({ ...prev, vgv }));
    setCredores(prev => recalcCredores(vgv, prev));
  };

  const handleCredorChange = (idx: number, field: string, value: any) => {
    setCredores(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      return recalcCredores(form.vgv, next);
    });
  };

  const totalPct = credores.reduce((s, c) => s + c.percentual, 0);
  const totalValor = credores.reduce((s, c) => s + c.valor, 0);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const pag = await createPagadoria.mutateAsync({
        ...form,
        criada_por: user.id,
        status: "pendente",
      });
      // Insert credores
      const credorRows = credores
        .filter(c => c.percentual > 0 || c.credor_tipo === "uhome")
        .map(c => ({
          pagadoria_id: (pag as any).id,
          credor_tipo: c.credor_tipo,
          credor_nome: c.credor_nome,
          credor_id: c.credor_id,
          percentual: c.percentual,
          valor: c.valor,
        }));
      await supabase.from("pagadoria_credores" as any).insert(credorRows);
      toast.success("Pagadoria criada com sucesso!");
      setWizardOpen(false);
      setStep(1);
      setForm({ cliente_nome: "", cliente_cpf: "", cliente_email: "", cliente_telefone: "", cliente_endereco: "", empreendimento: "", unidade: "", vgv: 0, data_venda: new Date().toISOString().slice(0, 10), forma_pagamento: "a_vista" });
      setCredores(DEFAULT_CREDORES);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" /> Pagadorias
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de pagadorias e comissões</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Pagadoria
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou empreendimento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aguardando_assinatura">Aguard. Assinatura</SelectItem>
            <SelectItem value="assinada">Assinadas</SelectItem>
            <SelectItem value="paga">Pagas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Nenhuma pagadoria encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">Crie uma nova pagadoria para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: any) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.rascunho;
            return (
              <Card key={p.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">{p.cliente_nome}</p>
                      <span className="text-xs text-muted-foreground">· {p.empreendimento}</span>
                      {p.unidade && <span className="text-xs text-muted-foreground">· {p.unidade}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>VGV: <strong className="text-foreground">R$ {Number(p.vgv).toLocaleString("pt-BR")}</strong></span>
                      <span>Venda: {new Date(p.data_venda).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">{st.label}</Badge>
                    {p.docusign_link && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(p.docusign_link, "_blank")}>
                        <Link className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Pagadoria — Passo {step}/3</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Dados da Venda</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cliente</Label><Input value={form.cliente_nome} onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))} placeholder="Nome completo" /></div>
                <div><Label>CPF</Label><Input value={form.cliente_cpf} onChange={e => setForm(f => ({ ...f, cliente_cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
                <div><Label>E-mail</Label><Input value={form.cliente_email} onChange={e => setForm(f => ({ ...f, cliente_email: e.target.value }))} /></div>
                <div><Label>Telefone</Label><Input value={form.cliente_telefone} onChange={e => setForm(f => ({ ...f, cliente_telefone: e.target.value }))} /></div>
                <div className="col-span-2"><Label>Endereço</Label><Input value={form.cliente_endereco} onChange={e => setForm(f => ({ ...f, cliente_endereco: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Empreendimento</Label><Input value={form.empreendimento} onChange={e => setForm(f => ({ ...f, empreendimento: e.target.value }))} /></div>
                <div><Label>Unidade</Label><Input value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} /></div>
                <div><Label>VGV (R$)</Label><Input type="number" value={form.vgv || ""} onChange={e => handleVgvChange(Number(e.target.value))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data da venda</Label><Input type="date" value={form.data_venda} onChange={e => setForm(f => ({ ...f, data_venda: e.target.value }))} /></div>
                <div>
                  <Label>Pagamento</Label>
                  <Select value={form.forma_pagamento} onValueChange={v => setForm(f => ({ ...f, forma_pagamento: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_vista">À vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!form.cliente_nome || !form.empreendimento || !form.vgv}>Próximo →</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Tabela de Comissões</h3>
              {faixas.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Faixas: {faixas.map((f: any) => `${f.percentual}% (até R$ ${f.vgv_max ? Number(f.vgv_max).toLocaleString("pt-BR") : "∞"})`).join(" · ")}
                </p>
              )}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Credor</th>
                      <th className="text-center px-3 py-2 font-medium w-24">%</th>
                      <th className="text-right px-3 py-2 font-medium w-32">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credores.map((c, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">
                          <Input
                            value={c.credor_nome}
                            onChange={e => handleCredorChange(i, "credor_nome", e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Nome do credor"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {i === credores.length - 1 ? (
                            <span className="text-sm font-semibold">{c.percentual.toFixed(2)}%</span>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={c.percentual || ""}
                              onChange={e => handleCredorChange(i, "percentual", Number(e.target.value))}
                              className="h-8 text-sm text-center w-20 mx-auto"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm">
                          R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 border-t-2">
                    <tr>
                      <td className="px-3 py-2 font-bold">Total</td>
                      <td className={`px-3 py-2 text-center font-bold ${Math.abs(totalPct - 100) > 0.01 ? "text-red-500" : "text-green-600"}`}>
                        {totalPct.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right font-bold font-mono">
                        R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {Math.abs(totalPct - 100) > 0.01 && (
                <p className="text-sm text-red-500 font-medium">⚠️ A soma dos percentuais deve ser 100%</p>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
                <Button onClick={() => setStep(3)} disabled={Math.abs(totalPct - 100) > 0.01}>Próximo →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Resumo & Envio</h3>
              <Card>
                <CardContent className="p-4 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Cliente:</span> <strong>{form.cliente_nome}</strong></div>
                    <div><span className="text-muted-foreground">CPF:</span> {form.cliente_cpf || "—"}</div>
                    <div><span className="text-muted-foreground">Empreendimento:</span> <strong>{form.empreendimento}</strong></div>
                    <div><span className="text-muted-foreground">Unidade:</span> {form.unidade || "—"}</div>
                    <div><span className="text-muted-foreground">VGV:</span> <strong>R$ {Number(form.vgv).toLocaleString("pt-BR")}</strong></div>
                    <div><span className="text-muted-foreground">Data:</span> {new Date(form.data_venda).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="font-semibold mb-2">Comissões:</p>
                    {credores.filter(c => c.percentual > 0).map((c, i) => (
                      <div key={i} className="flex justify-between py-0.5">
                        <span>{c.credor_nome || c.credor_tipo}</span>
                        <span className="font-mono">{c.percentual.toFixed(2)}% — R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>← Voltar</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Salvar como Pendente
                  </Button>
                  <Button onClick={() => { toast.info("Copie o link da pagadoria e envie pelo DocuSign manualmente."); handleSave(); }} disabled={saving}>
                    📤 Salvar + Gerar link DocuSign
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
