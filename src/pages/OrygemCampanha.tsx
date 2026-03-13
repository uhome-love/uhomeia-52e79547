import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2, Phone, MessageSquare, Copy, MapPin, Target, Star,
  ChevronDown, ChevronUp, Home, DollarSign, Users, Calendar,
  TreePine, Dumbbell, PartyPopper, Baby, Dog, Flame, Palmtree,
  Waves, Send, FileText, ArrowRight, Gift, Sparkles, Car, Eye,
  BadgeCheck, ShieldCheck, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const CAMPAIGN_TARGET = 10;
const CAMPAIGN_VGV = 10_000_000;

const INFRASTRUCTURE = [
  { icon: Waves, label: "Piscina", color: "text-blue-500" },
  { icon: Dumbbell, label: "Academia", color: "text-orange-500" },
  { icon: PartyPopper, label: "Salão de festas", color: "text-pink-500" },
  { icon: Baby, label: "Playground", color: "text-purple-500" },
  { icon: Target, label: "Beach tennis", color: "text-amber-500" },
  { icon: Dog, label: "Pet space", color: "text-emerald-500" },
  { icon: Flame, label: "Fogo de chão", color: "text-red-500" },
  { icon: Palmtree, label: "Quiosques com churrasqueira", color: "text-lime-600" },
  { icon: TreePine, label: "Área verde preservada", color: "text-green-600" },
];

const BROKER_ARGUMENTS = [
  "Casa com valor próximo de apartamento",
  "Condomínio clube completo",
  "Casa com pátio e terraço",
  "Produto raro em Porto Alegre",
  "Empreendimento quase pronto",
  "Possibilidade de visitar obra e decorado",
];

const SCRIPTS = [
  {
    title: "Primeiro contato",
    text: `Oi {{nome}}! Tudo bem?\n\nEstou com casas em condomínio com pátio e terraço no Orygem Residence Club.\n\n🏠 150m² a 173m²\n🏊 Condomínio clube\n👁️ Visita no decorado\n\nValores a partir de R$ 871 mil.\n\nQuer que eu te mande as plantas?`,
  },
  {
    title: "Campanha especial",
    text: `{{nome}}, estamos com uma campanha especial no Orygem.\n\nCasas com:\n🌿 Pátio\n🏠 Terraço\n🏊 Condomínio clube\n\nE já dá para visitar o decorado.\n\nQuer agendar uma visita?`,
  },
  {
    title: "Urgência / Escassez",
    text: `Oi {{nome}}!\n\nAlgumas casas do Orygem estão com condições especiais e o empreendimento já está quase pronto.\n\n📐 150 a 173m²\n🛏️ 2 ou 3 dormitórios\n🏊 Condomínio completo\n\nPosso te mostrar as melhores unidades?`,
  },
];

const PAYMENT_CONDITIONS = [
  "30% no fluxo",
  "Saldo financiado após entrega",
  "Crédito associativo",
  "Financiamento bancário",
  "FGTS",
];

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado!");
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export default function OrygemCampanha() {
  const navigate = useNavigate();
  const [showScripts, setShowScripts] = useState(false);
  const [showArguments, setShowArguments] = useState(false);
  const [salesCount] = useState(0); // connect to real data later

  const progress = Math.round((salesCount / CAMPAIGN_TARGET) * 100);

  return (
    <div className="space-y-5 pb-24">
      {/* ═══ HERO ═══ */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0d2137] to-[#1a3a5c] p-5 md:p-8">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-tr from-emerald-400/5 to-transparent" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-500 text-white border-0 text-xs font-bold px-3">🏠 60 DIAS</Badge>
            <Badge variant="outline" className="border-white/20 text-white/70 text-[10px]">Casas em condomínio</Badge>
            <Badge variant="outline" className="border-white/20 text-white/70 text-[10px]">Decorado disponível</Badge>
            <Badge variant="outline" className="border-white/20 text-white/70 text-[10px]">Visita na obra</Badge>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
            ORYGEM <span className="text-emerald-400">Residence Club</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-lg">
            Campanha especial — vender <strong className="text-emerald-400">10 casas em 60 dias</strong>. Casas de 150 a 173m² em condomínio clube no Teresópolis.
          </p>

          {/* Bateu Levou highlight */}
          <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 max-w-md backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-5 w-5 text-amber-400" />
              <span className="text-amber-300 font-black text-sm">BATEU LEVOU</span>
            </div>
            <p className="text-white/80 text-xs">
              <strong className="text-amber-400">R$ 5.000</strong> por venda para o corretor
            </p>
          </div>

          <div className="flex gap-2 pt-1 flex-wrap">
            <Button size="sm" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white border-0">
              <Calendar className="h-3.5 w-3.5" /> Agendar Visita
            </Button>
            <Button size="sm" className="gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm" onClick={() => navigate("/oferta-ativa")}>
              <Sparkles className="h-3.5 w-3.5" /> Iniciar Oferta
            </Button>
            <Button size="sm" className="gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm" onClick={() => navigate("/imoveis")}>
              <Eye className="h-3.5 w-3.5" /> Ver Tipologias
            </Button>
            <Button size="sm" className="gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm" onClick={() => navigate("/pipeline-leads")}>
              <Target className="h-3.5 w-3.5" /> Abrir Pipeline
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ SALES GOAL TRACKER ═══ */}
      <Card className="border-emerald-200 overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50 to-green-50">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" /> Meta da Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black text-emerald-600">{salesCount}/{CAMPAIGN_TARGET}</p>
              <p className="text-xs text-muted-foreground">casas vendidas</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">VGV Estimado</p>
              <p className="text-sm font-semibold text-emerald-600">R$ {(CAMPAIGN_VGV / 1_000_000).toFixed(0)} milhões</p>
            </div>
          </div>
          <Progress value={progress} className="h-3 [&>div]:bg-emerald-500" />
          <p className="text-[10px] text-muted-foreground text-center">{progress}% da meta</p>
        </CardContent>
      </Card>

      {/* ═══ EMPREENDIMENTO INFO ═══ */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Orygem Residence Club
          </CardTitle>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Teresópolis — Porto Alegre
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-foreground/80 leading-relaxed">
            Condomínio fechado de casas com infraestrutura de clube. Produto raro em Porto Alegre com pátio privativo, terraço e possibilidade de spa ou piscina.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: Home, label: "150 a 173m²", sub: "Área privativa" },
              { icon: Building2, label: "2 ou 3 dorms", sub: "Dormitórios" },
              { icon: Car, label: "2 vagas", sub: "Garagem" },
              { icon: Building2, label: "3 pavimentos", sub: "Andares" },
            ].map((f) => (
              <div key={f.label} className="bg-muted/50 rounded-lg p-3 text-center">
                <f.icon className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <p className="text-xs font-bold text-foreground">{f.label}</p>
                <p className="text-[10px] text-muted-foreground">{f.sub}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Pátio privativo", "Terraço", "Churrasqueira", "Spa / Piscina possível"].map((d) => (
              <Badge key={d} variant="outline" className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50">
                {d}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ INFRAESTRUTURA ═══ */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4 text-emerald-500" /> Infraestrutura do Clube
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {INFRASTRUCTURE.map((item) => (
              <div key={item.label} className="bg-muted/50 rounded-xl p-3 text-center hover:bg-muted/80 transition-colors">
                <item.icon className={`h-5 w-5 mx-auto mb-1.5 ${item.color}`} />
                <p className="text-[10px] font-medium text-foreground leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ TIPOLOGIAS ═══ */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 2 Dorms */}
        <Card className="border-emerald-200/60 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white">
            <Badge className="bg-white/20 text-white border-0 text-[10px] mb-2">2 Dormitórios</Badge>
            <p className="text-2xl font-black">150m²</p>
          </div>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-1.5">
              {["Suíte", "Pátio com churrasqueira", "Terraço", "Living integrado", "2 vagas"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground">A partir de</p>
              <p className="text-xl font-black text-emerald-600">R$ 871.500</p>
            </div>
          </CardContent>
        </Card>

        {/* 3 Dorms */}
        <Card className="border-emerald-200/60 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 text-white">
            <Badge className="bg-white/20 text-white border-0 text-[10px] mb-2">3 Dormitórios</Badge>
            <p className="text-2xl font-black">173,71m²</p>
          </div>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-1.5">
              {["Suíte", "Terraço", "Pátio", "Espaço para spa ou piscina", "2 vagas"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground">A partir de</p>
              <p className="text-xl font-black text-emerald-600">R$ 909.200</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ CONDIÇÕES DE PAGAMENTO ═══ */}
      <Card className="border-amber-200 overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-500" /> Condições de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-2">
          {PAYMENT_CONDITIONS.map((c) => (
            <div key={c} className="flex items-center gap-2 text-xs text-foreground/80">
              <BadgeCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              {c}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══ COMO VENDER ═══ */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setShowArguments(!showArguments)}>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Como Vender o Orygem
            {showArguments ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        {showArguments && (
          <CardContent className="space-y-2 pt-0">
            {BROKER_ARGUMENTS.map((arg, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Star className="h-3 w-3 text-emerald-600" />
                </div>
                <p className="text-xs text-foreground/80">{arg}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* ═══ SCRIPTS WHATSAPP ═══ */}
      <Card className="border-emerald-200/50">
        <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setShowScripts(!showScripts)}>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-500" /> Scripts WhatsApp ({SCRIPTS.length})
            {showScripts ? <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        {showScripts && (
          <CardContent className="space-y-3 pt-0">
            {SCRIPTS.map((script, i) => (
              <div key={i} className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700">{script.title}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(script.text)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{script.text}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* ═══ QUICK ACTIONS ═══ */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" /> Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { icon: Calendar, label: "Agendar visita", color: "bg-emerald-500 hover:bg-emerald-600", action: () => toast.info("Funcionalidade em breve") },
              { icon: Target, label: "Abrir pipeline", color: "bg-primary hover:bg-primary/90", action: () => navigate("/pipeline-leads") },
              { icon: Send, label: "Enviar WhatsApp", color: "bg-green-600 hover:bg-green-700", action: () => { setShowScripts(true); toast.info("Copie um script acima"); } },
              { icon: FileText, label: "Enviar plantas", color: "bg-blue-600 hover:bg-blue-700", action: () => toast.info("Funcionalidade em breve") },
              { icon: DollarSign, label: "Gerar proposta", color: "bg-amber-500 hover:bg-amber-600", action: () => toast.info("Funcionalidade em breve") },
            ].map((btn) => (
              <Button
                key={btn.label}
                size="sm"
                className={`gap-1.5 text-white border-0 text-xs ${btn.color}`}
                onClick={btn.action}
              >
                <btn.icon className="h-3.5 w-3.5" />
                {btn.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ IMAGE GALLERY ═══ */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-500" /> Galeria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Fachada", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80" },
              { label: "Lazer", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" },
              { label: "Interior", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80" },
              { label: "Decorado", url: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80" },
            ].map((img) => (
              <div key={img.label} className="relative group rounded-xl overflow-hidden aspect-[4/3] cursor-pointer">
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute bottom-2 left-2 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
