import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Video, Map, DollarSign, Globe, Upload, Trash2,
  Search, Plus, Loader2, ExternalLink, Eye, FolderOpen
} from "lucide-react";

interface Material {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  empreendimento: string | null;
  url: string;
  arquivo_nome: string | null;
  categoria: string;
  created_at: string;
}

const TIPO_ICONS: Record<string, any> = {
  pdf: FileText,
  video: Video,
  tour_virtual: Globe,
  mapa: Map,
  tabela_valores: DollarSign,
  outro: FileText,
};

const TIPO_LABELS: Record<string, string> = {
  pdf: "PDF",
  video: "Vídeo",
  tour_virtual: "Tour Virtual",
  mapa: "Mapa",
  tabela_valores: "Tabela de Valores",
  outro: "Outro",
};

const CATEGORIAS = [
  { value: "geral", label: "Geral" },
  { value: "comercial", label: "Comercial" },
  { value: "tecnico", label: "Técnico" },
  { value: "marketing", label: "Marketing" },
];

export default function MaterialsLibrary() {
  const { user } = useAuth();
  const { isGestor, isAdmin } = useUserRole();
  const canManage = isGestor || isAdmin;
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterEmpre, setFilterEmpre] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // New material form
  const [form, setForm] = useState({
    titulo: "", descricao: "", tipo: "pdf", empreendimento: "",
    url: "", categoria: "geral",
  });
  const [file, setFile] = useState<File | null>(null);

  const loadMaterials = useCallback(async () => {
    const { data } = await supabase
      .from("pipeline_materiais")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false });
    setMaterials((data || []) as Material[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  const empreendimentos = [...new Set(materials.map(m => m.empreendimento).filter(Boolean))] as string[];

  const filtered = materials.filter(m => {
    if (filterTipo !== "all" && m.tipo !== filterTipo) return false;
    if (filterEmpre !== "all" && m.empreendimento !== filterEmpre) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.titulo.toLowerCase().includes(q) && !m.empreendimento?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleUpload = async () => {
    if (!user) return;
    setUploading(true);
    try {
      let url = form.url;
      let fileName = null;
      let fileSize = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("materiais")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("materiais").getPublicUrl(path);
        url = publicUrl;
        fileName = file.name;
        fileSize = file.size;
      }

      if (!url) { toast.error("Forneça um arquivo ou URL"); return; }

      const { error } = await supabase.from("pipeline_materiais").insert({
        titulo: form.titulo || file?.name || "Material",
        descricao: form.descricao || null,
        tipo: form.tipo,
        empreendimento: form.empreendimento || null,
        url,
        arquivo_nome: fileName,
        tamanho_bytes: fileSize,
        categoria: form.categoria,
        criado_por: user.id,
      });

      if (error) throw error;
      toast.success("Material adicionado!");
      setAddOpen(false);
      setForm({ titulo: "", descricao: "", tipo: "pdf", empreendimento: "", url: "", categoria: "geral" });
      setFile(null);
      loadMaterials();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao adicionar material");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pipeline_materiais").update({ ativo: false } as any).eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    setMaterials(prev => prev.filter(m => m.id !== id));
    toast.success("Material removido");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar material..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEmpre} onValueChange={setFilterEmpre}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Empreendimento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {empreendimentos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        {canManage && (
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 h-9">
            <Plus className="h-4 w-4" /> Novo Material
          </Button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <FolderOpen className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">Nenhum material encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(m => {
            const Icon = TIPO_ICONS[m.tipo] || FileText;
            return (
              <Card key={m.id} className="p-4 hover:shadow-md transition-shadow group">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground truncate">{m.titulo}</h4>
                    {m.descricao && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{m.descricao}</p>}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{TIPO_LABELS[m.tipo] || m.tipo}</Badge>
                      {m.empreendimento && <Badge variant="outline" className="text-[10px]">{m.empreendimento}</Badge>}
                      <Badge variant="outline" className="text-[10px]">{m.categoria}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={m.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </Button>
                  </a>
                  <a href={m.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                      <Eye className="h-3 w-3" /> Visualizar
                    </Button>
                  </a>
                  {canManage && (
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-destructive hover:text-destructive ml-auto" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Material Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Novo Material
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Nome do material" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Empreendimento</Label>
              <Input value={form.empreendimento} onChange={e => setForm(p => ({ ...p, empreendimento: e.target.value }))} placeholder="Ex: Casa Tua" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Breve descrição" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Upload de Arquivo</Label>
              <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1" accept=".pdf,.mp4,.jpg,.png,.webp" />
            </div>
            <div>
              <Label className="text-xs">Ou URL externa</Label>
              <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || (!file && !form.url)} className="gap-1.5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
