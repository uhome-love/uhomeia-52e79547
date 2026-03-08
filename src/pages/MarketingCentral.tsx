import { useState } from "react";
import { useConteudosMarketing } from "@/hooks/useBackofficeData";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Lightbulb, BarChart3, Plus, Palette, Camera, Video, Megaphone, Building2, PartyPopper, Newspaper, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  planejado: { label: "Planejado", color: "bg-neutral-500", icon: "📝" },
  em_producao: { label: "Em Produção", color: "bg-amber-500", icon: "🟡" },
  revisao: { label: "Revisão", color: "bg-blue-500", icon: "🔵" },
  agendado: { label: "Agendado", color: "bg-green-500", icon: "🟢" },
  publicado: { label: "Publicado", color: "bg-emerald-600", icon: "✅" },
  atrasado: { label: "Atrasado", color: "bg-red-500", icon: "🔴" },
};

const TIPOS = [
  { value: "post_estatico", label: "📸 Post Estático", icon: Camera },
  { value: "reels", label: "🎬 Reels/TikTok", icon: Video },
  { value: "anuncio", label: "📣 Anúncio Pago", icon: Megaphone },
  { value: "institucional", label: "🏢 Institucional", icon: Building2 },
  { value: "endomarketing", label: "🎉 Endomarketing", icon: PartyPopper },
  { value: "informativo", label: "📰 Informativo", icon: Newspaper },
];

export default function MarketingCentral() {
  const { user } = useAuth();
  const { conteudos, isLoading, createConteudo, updateConteudo, deleteConteudo } = useConteudosMarketing();
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "post_estatico",
    plataforma: ["instagram"],
    tema: "",
    descricao: "",
    data_publicacao: "",
    status: "planejado",
  });

  const handleCreate = async () => {
    if (!user || !form.tema) return;
    try {
      await createConteudo.mutateAsync({
        ...form,
        data_publicacao: form.data_publicacao ? new Date(form.data_publicacao).toISOString() : null,
        criado_por: user.id,
      });
      toast.success("Conteúdo criado!");
      setNewOpen(false);
      setForm({ tipo: "post_estatico", plataforma: ["instagram"], tema: "", descricao: "", data_publicacao: "", status: "planejado" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getEffectiveStatus = (c: any) => {
    if (c.status === "publicado" || c.status === "agendado") return c.status;
    if (c.data_publicacao && new Date(c.data_publicacao) < new Date() && !["publicado", "agendado"].includes(c.status)) return "atrasado";
    return c.status;
  };

  // Group by week
  const today = new Date();
  const thisWeek = conteudos.filter((c: any) => {
    if (!c.data_publicacao) return false;
    const d = new Date(c.data_publicacao);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= -7 && diff <= 7;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6 text-purple-500" /> Central de Marketing
          </h1>
          <p className="text-sm text-muted-foreground">Agenda editorial, ideias e performance</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Conteúdo
        </Button>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agenda" className="gap-1 text-xs"><CalendarDays className="h-3.5 w-3.5" /> Agenda</TabsTrigger>
          <TabsTrigger value="ideias" className="gap-1 text-xs"><Lightbulb className="h-3.5 w-3.5" /> Ideias</TabsTrigger>
          <TabsTrigger value="performance" className="gap-1 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : conteudos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Nenhum conteúdo planejado</p>
                <p className="text-sm text-muted-foreground mt-1">Crie conteúdos para preencher a agenda editorial.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {conteudos.map((c: any) => {
                const effectiveStatus = getEffectiveStatus(c);
                const st = STATUS_MAP[effectiveStatus] || STATUS_MAP.planejado;
                const tipoInfo = TIPOS.find(t => t.value === c.tipo);

                return (
                  <Card key={c.id} className={`hover:border-primary/30 transition-colors ${effectiveStatus === "atrasado" ? "border-red-500/30" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">{tipoInfo?.label || c.tipo}</span>
                            <Badge variant="secondary" className="text-[10px]">{(c.plataforma || []).join(" + ")}</Badge>
                          </div>
                          <p className="font-semibold text-foreground">{c.tema}</p>
                          {c.descricao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.descricao}</p>}
                          {c.data_publicacao && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📅 {format(new Date(c.data_publicacao), "EEEE, dd/MM · HH'h'", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={effectiveStatus === "atrasado" ? "destructive" : "secondary"}>
                            {st.icon} {st.label}
                          </Badge>
                          <Select
                            value={c.status}
                            onValueChange={(v) => updateConteudo.mutate({ id: c.id, status: v })}
                          >
                            <SelectTrigger className="w-[130px] h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planejado">Planejado</SelectItem>
                              <SelectItem value="em_producao">Em Produção</SelectItem>
                              <SelectItem value="revisao">Revisão</SelectItem>
                              <SelectItem value="agendado">Agendado</SelectItem>
                              <SelectItem value="publicado">Publicado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ideias" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center">
              <Lightbulb className="h-10 w-10 mx-auto mb-3 text-amber-500" />
              <p className="font-medium">Gerador de Ideias</p>
              <p className="text-sm text-muted-foreground mt-1">Use o HOMI Ana para gerar ideias de conteúdo personalizadas!</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/homi-ana"}>
                🤖 Abrir HOMI Ana
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 text-blue-500" />
              <p className="font-medium">Performance de Anúncios</p>
              <p className="text-sm text-muted-foreground mt-1">Em breve: integração com Meta Ads e Google Ads</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Content Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Conteúdo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tema / Título</Label>
              <Input value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} placeholder="Ex: Post Shift — condições março" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Data de publicação</Label>
              <Input type="datetime-local" value={form.data_publicacao} onChange={e => setForm(f => ({ ...f, data_publicacao: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={!form.tema}>
              Criar Conteúdo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
