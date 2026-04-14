import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Eye, Pencil, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmailTemplates } from "@/hooks/useEmail";
import { toast } from "sonner";

const PLACEHOLDERS = ["{{nome}}", "{{email}}", "{{telefone}}", "{{empreendimento}}", "{{bairro}}", "{{corretor}}", "{{link_landing}}", "{{link_whatsapp}}", "{{origem}}", "{{faixa_valor}}"];

export default function EmailTemplatesTab() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useEmailTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", assunto: "", html_content: "", text_content: "", categoria: "geral" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const handleSave = async () => {
    if (!form.nome || !form.assunto) { toast.error("Nome e assunto obrigatórios"); return; }
    if (editingId) {
      const ok = await updateTemplate(editingId, form as any);
      if (ok) { setDialogOpen(false); setEditingId(null); }
    } else {
      const ok = await createTemplate(form as any);
      if (ok) { setDialogOpen(false); }
    }
    setForm({ nome: "", assunto: "", html_content: "", text_content: "", categoria: "geral" });
  };

  const openEdit = (t: any) => {
    setForm({ nome: t.nome, assunto: t.assunto, html_content: t.html_content, text_content: t.text_content || "", categoria: t.categoria });
    setEditingId(t.id);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        <Button size="sm" onClick={() => { setEditingId(null); setForm({ nome: "", assunto: "", html_content: "", text_content: "", categoria: "geral" }); setDialogOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum template criado ainda</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map(t => (
            <Card key={t.id} className={`p-4 ${!t.ativo ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{t.nome}</h4>
                    <Badge variant="secondary" className="text-[10px]">{t.categoria}</Badge>
                    {!t.ativo && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Assunto: {t.assunto}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewHtml(t.html_content)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="campanha">Campanha</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="reativacao">Reativação</SelectItem>
                    <SelectItem value="transacional">Transacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assunto</Label>
              <Input value={form.assunto} onChange={e => setForm(p => ({ ...p, assunto: e.target.value }))} placeholder="Assunto do email" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Conteúdo HTML</Label>
              <Textarea value={form.html_content} onChange={e => setForm(p => ({ ...p, html_content: e.target.value }))} rows={12} className="font-mono text-xs" placeholder="<html>...</html>" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Versão texto simples (opcional)</Label>
              <Textarea value={form.text_content} onChange={e => setForm(p => ({ ...p, text_content: e.target.value }))} rows={4} className="text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Placeholders disponíveis</Label>
              <div className="flex flex-wrap gap-1">
                {PLACEHOLDERS.map(p => (
                  <Badge key={p} variant="outline" className="text-[10px] cursor-pointer hover:bg-accent" onClick={() => {
                    navigator.clipboard.writeText(p);
                    toast.success(`${p} copiado`);
                  }}>{p}</Badge>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editingId ? "Salvar alterações" : "Criar template"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Preview do Template</DialogTitle></DialogHeader>
          <div className="border rounded-lg overflow-auto max-h-[60vh] bg-white">
            <iframe srcDoc={previewHtml || ""} className="w-full min-h-[400px]" sandbox="" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
