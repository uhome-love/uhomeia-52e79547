import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Phone, MessageSquare, Copy, ExternalLink, MapPin, Maximize2, Tag, Clock, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { toast } from "sonner";

// ── Data ──

type Empreendimento = {
  nome: string;
  bairro: string;
  metragens: string;
  dorms: string;
  status: string;
  precoDe?: string;
  precoPor?: string;
  imagem?: string;
  condicoes?: string;
};

const SEGMENTOS: Record<string, { label: string; cor: string; condicoes: string; empreendimentos: Empreendimento[] }> = {
  mcmv: {
    label: "MCMV / Econômico",
    cor: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    condicoes: "Até 100% financiados | ITBI/Registro pagos pela Melnick | Aluguel 6 meses garantido",
    empreendimentos: [
      { nome: "Open Major", bairro: "Marechal Rondon", metragens: "43 m²", dorms: "2 dorms", status: "Em obras", precoPor: "R$ 235.505", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122722/open-major.png" },
      { nome: "Open Alto Ipiranga", bairro: "Jardim Carvalho", metragens: "42 m²", dorms: "2 dorms", status: "Em obras", precoPor: "R$ 271.310", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122643/Camada-20.png" },
      { nome: "Open Bosque", bairro: "Passo d'Areia", metragens: "31 a 63 m²", dorms: "Até 3 dorms", status: "Em obras", precoPor: "R$ 240.582", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122725/Retangulo-2.png" },
    ],
  },
  medio: {
    label: "Médio Padrão",
    cor: "bg-blue-500/10 text-blue-700 border-blue-200",
    condicoes: "10% de entrada | Saldo em até 36x sem juros",
    empreendimentos: [
      { nome: "Supreme Altos do Central Parque", bairro: "Jardim do Salso", metragens: "59 a 70 m²", dorms: "2 e 3 dorms", status: "Pronto", precoDe: "R$ 657.169", precoPor: "R$ 499.448", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122731/supreme.png" },
      { nome: "Grand Park Lindóia", bairro: "São Sebastião", metragens: "56 a 81 m²", dorms: "2 e 3 dorms", status: "Pronto", precoDe: "R$ 622.810", precoPor: "R$ 485.792", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122658/Camada-933.png" },
      { nome: "Vida Viva Linked", bairro: "Teresópolis", metragens: "55 e 67 m²", dorms: "2 e 3 dorms", status: "Pronto", precoDe: "R$ 656.978", precoPor: "R$ 499.303", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122656/Camada-932.png" },
      { nome: "GO Cidade Baixa", bairro: "Cidade Baixa", metragens: "27 a 90 m²", dorms: "Studio a 3 dorms", status: "Pronto", precoDe: "R$ 771.277", precoPor: "R$ 524.468", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122703/cidade-baixa.png" },
      { nome: "GO Rio Branco", bairro: "Rio Branco", metragens: "25 a 63 m²", dorms: "Studio a 2 dorms", status: "Pronto", precoDe: "R$ 956.910", precoPor: "R$ 832.512", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122727/rio-granco.png" },
      { nome: "Linked Teresópolis", bairro: "Glória", metragens: "35 a 53 m²", dorms: "Lofts e 1 dorm", status: "Pronto", precoDe: "R$ 524.902", precoPor: "R$ 461.914", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122644/Camada-913.png" },
      { nome: "Grand Park Moinhos", bairro: "Canoas", metragens: "56 a 87 m²", dorms: "2 e 3 dorms", status: "Em obras", precoDe: "R$ 546.932", precoPor: "R$ 464.892" },
      { nome: "High Garden Iguatemi", bairro: "Boa Vista", metragens: "102 a 125 m²", dorms: "Até 3 suítes", status: "Em obras", precoDe: "R$ 1.649.477", precoPor: "R$ 1.232.604", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122629/Camada-7.png" },
    ],
  },
  alto: {
    label: "Alto Padrão",
    cor: "bg-amber-500/10 text-amber-700 border-amber-200",
    condicoes: "Avaliação acima do mercado na troca | Carro como entrada | Descontos exclusivos | Negociação direta com a diretoria",
    empreendimentos: [
      { nome: "SEEN Três Figueiras", bairro: "Três Figueiras", metragens: "149 e 169 m²", dorms: "3 a 4 suítes", status: "Em obras", precoDe: "R$ 2.504.640", precoPor: "R$ 1.596.482", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122710/fachada_seen_tres_figueiras-1.png" },
      { nome: "Gama, 1375", bairro: "Auxiliadora", metragens: "159 m²", dorms: "3 suítes", status: "Em obras", precoDe: "R$ 2.429.859", precoPor: "R$ 1.707.589", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122713/gama.png" },
      { nome: "SEEN Boa Vista", bairro: "Boa Vista", metragens: "156 m²", dorms: "3 suítes", status: "Pronto", precoDe: "R$ 2.842.040", precoPor: "R$ 2.671.517", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122625/Camada-4.png" },
      { nome: "SEEN Menino Deus", bairro: "Menino Deus", metragens: "98 e 151 m²", dorms: "3 suítes", status: "Em obras", precoDe: "R$ 1.808.963", precoPor: "R$ 1.338.633", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122721/menino-deus.png" },
      { nome: "High Garden Rio Branco", bairro: "Rio Branco", metragens: "123 e 143 m²", dorms: "3 suítes", status: "Em obras", precoDe: "R$ 2.040.468", precoPor: "R$ 1.636.005", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122716/high-garden.png" },
      { nome: "Botanique Residence", bairro: "Petrópolis", metragens: "98 e 115 m²", dorms: "3 dorms", status: "Pronto", precoDe: "R$ 1.854.951", precoPor: "R$ 1.407.003", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122620/botanique.png" },
      { nome: "Yofi", bairro: "Bom Fim", metragens: "131 e 144 m²", dorms: "3 suítes", status: "Em obras", precoDe: "R$ 2.307.446", precoPor: "R$ 1.645.058", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122741/yofi.png" },
      { nome: "Square Garden", bairro: "Santa Cecília", metragens: "93 a 119 m²", dorms: "3 dorms", status: "Lançamento", precoDe: "R$ 1.911.621", precoPor: "R$ 1.312.054", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122634/Camada-12.png" },
      { nome: "Jazz Nova York", bairro: "Auxiliadora", metragens: "118 m²", dorms: "3 suítes", status: "Em obras", precoDe: "R$ 2.065.289", precoPor: "R$ 1.628.005", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122628/Camada-6.png" },
      { nome: "GO Moinhos", bairro: "Moinhos de Vento", metragens: "106 m²", dorms: "3 dorms", status: "Em obras", precoDe: "R$ 1.890.885", precoPor: "R$ 1.543.682", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122621/Camada-1.png" },
      { nome: "Mirá - Zuckhan", bairro: "Petrópolis", metragens: "155 a 313 m²", dorms: "3 suítes", status: "2027", precoDe: "R$ 2.604.000", precoPor: "R$ 2.300.000", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122641/Camada-18.png" },
      { nome: "Season - TGD", bairro: "Rio Branco", metragens: "118 a 122 m²", dorms: "3 suítes", status: "2027", precoDe: "R$ 1.804.946", precoPor: "R$ 1.534.204" },
    ],
  },
  altissimo: {
    label: "Altíssimo Padrão",
    cor: "bg-purple-500/10 text-purple-700 border-purple-200",
    condicoes: "Avaliação acima do mercado na troca | Carro como entrada | Negociação direta com a diretoria",
    empreendimentos: [
      { nome: "Nilo Square Résidence", bairro: "Boa Vista", metragens: "176 e 216 m²", dorms: "3 suítes", status: "Em obras", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122659/Camada-934.png" },
      { nome: "Arte Cidade Nilo", bairro: "Bela Vista", metragens: "273 e 330 m²", dorms: "3 e 4 suítes", status: "Em obras", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122700/Camada-935.png" },
      { nome: "Arte Country Club", bairro: "Bela Vista", metragens: "246 a 321 m²", dorms: "3 e 4 suítes", status: "Em obras", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122653/Camada-923.png" },
      { nome: "Casa Moinhos", bairro: "Moinhos de Vento", metragens: "292 a 644 m²", dorms: "4 suítes", status: "Em obras", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122707/Fachada_EF-scaled-1-1.png" },
      { nome: "Zayt", bairro: "Bela Vista", metragens: "490 a 540 m²", dorms: "4 suítes", status: "Em obras", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122654/Camada-924.png" },
    ],
  },
  investimento: {
    label: "Investimento",
    cor: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
    condicoes: "Até 100% financiados | ITBI/Registro pagos pela Melnick | Aluguel 6 meses garantido",
    empreendimentos: [
      { nome: "Carlos Gomes Square", bairro: "Auxiliadora", metragens: "26 a 59 m²", dorms: "Lofts e 1 dorm", status: "Pronto", precoDe: "R$ 989.577", precoPor: "R$ 930.203", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122655/Camada-931.png" },
      { nome: "Reserva do Lago", bairro: "Petrópolis", metragens: "Até 406 m²", dorms: "Terrenos", status: "Pronto", precoPor: "R$ 148.500", imagem: "https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122630/Camada-8.png" },
      { nome: "GO Bom Fim", bairro: "Bom Fim", metragens: "28 a 40 m²", dorms: "1 dorm", status: "Em obras" },
      { nome: "GO Carlos Gomes", bairro: "Boa Vista", metragens: "25 a 49 m²", dorms: "1-2 dorms", status: "Pronto" },
      { nome: "GO Home Design", bairro: "Bela Vista", metragens: "25 a 32 m²", dorms: "1 dorm", status: "Em obras" },
      { nome: "GO 24", bairro: "Auxiliadora", metragens: "24 a 29 m²", dorms: "1 dorm", status: "Pronto" },
      { nome: "Maxplaza", bairro: "Canoas, Centro", metragens: "34 a 47 m²", dorms: "1 dorm", status: "Pronto" },
      { nome: "Nilo Square Multistay", bairro: "Boa Vista", metragens: "24 a 64 m²", dorms: "1 dorm", status: "Entrega 2026" },
      { nome: "Nilo Square Hotel", bairro: "Boa Vista", metragens: "29 a 34 m²", dorms: "1 dorm", status: "Entrega 2026" },
      { nome: "Square Garden Multistay", bairro: "Santa Cecília", metragens: "19 a 40 m²", dorms: "1 dorm", status: "Lançamento" },
    ],
  },
};

// ── Scripts por segmento ──

const SCRIPTS: Record<string, { ligacao: string; followup: string[] }> = {
  mcmv: {
    ligacao: `📞 ABERTURA\n"Olá {{nome}}, tudo bem? Aqui é o {{corretor}} da UHome! Estou ligando porque temos uma oportunidade incrível no Melnick Day, dia 21 de março."\n\n🔍 EXPLORAÇÃO\n"Você já conhece os empreendimentos da linha Open da Melnick? São apartamentos novos com condição MCMV, financiamento de até 100% e ITBI/registro pagos pela construtora."\n\n🏠 PRODUTO\n"Temos unidades a partir de R$ 235 mil em regiões como Passo d'Areia e Jardim Carvalho. Parcelas que cabem no bolso e sem entrada!"\n\n📍 VISITA\n"Que tal conhecer o decorado? Posso agendar para esta semana, antes do Melnick Day, assim você já chega preparado(a) para garantir sua unidade."\n\n🎯 FECHAMENTO\n"Vou te enviar os detalhes pelo WhatsApp. Qual o melhor horário para a visita?"`,
    followup: [
      `Oi {{nome}}! 😊 Passando para lembrar do Melnick Day (21/03). Temos unidades Open com financiamento de até 100% + ITBI e registro pagos. Quer que eu te mande as opções disponíveis?`,
      `{{nome}}, vi que você se interessou por apartamentos econômicos. No Melnick Day tem desconto real + 6 meses de aluguel garantido. Bora garantir antes que acabe? 🏠`,
      `Oi {{nome}}! Ainda pensando no apê? As unidades Open do Melnick Day estão indo rápido. Posso te ajudar com a simulação de financiamento? 📊`,
    ],
  },
  medio: {
    ligacao: `📞 ABERTURA\n"Oi {{nome}}, aqui é o {{corretor}} da UHome! Tudo bem? Estou ligando sobre o Melnick Day, dia 21 de março — o maior evento imobiliário do ano."\n\n🔍 EXPLORAÇÃO\n"Percebi que você tem interesse em morar bem em Porto Alegre. Posso te perguntar: o que é mais importante pra você? Localização, tamanho do apartamento ou valor?"\n\n🏠 PRODUTO\n"Temos empreendimentos incríveis com até 32% de desconto! Por exemplo, o Supreme no Jardim do Salso saiu de R$ 657 mil por R$ 499 mil. Condição: 10% de entrada e saldo em até 36x sem juros."\n\n📍 VISITA\n"Quer conhecer o decorado antes do evento? Assim você já chega sabendo exatamente qual unidade reservar."\n\n🎯 FECHAMENTO\n"Vou te enviar pelo WhatsApp as opções que mais combinam com seu perfil. Pode ser?"`,
    followup: [
      `Oi {{nome}}! No Melnick Day (21/03) temos apartamentos de 2 e 3 dorms com até 32% OFF + entrada de 10% e saldo em 36x sem juros. Quer ver as opções? 🏠`,
      `{{nome}}, lembrete: as melhores unidades do Melnick Day são reservadas por ordem de chegada! Que tal agendar uma visita ao decorado esta semana? 📍`,
      `Oi {{nome}}, ainda buscando seu apê? Separei 3 opções que combinam com o que você procura, com desconto Melnick Day. Posso te enviar? 😊`,
    ],
  },
  alto: {
    ligacao: `📞 ABERTURA\n"{{nome}}, boa tarde! Aqui é {{corretor}} da UHome. Estou entrando em contato porque temos condições absolutamente excepcionais no Melnick Day para imóveis de alto padrão."\n\n🤝 CONEXÃO\n"Sei que para quem busca um imóvel desse perfil, o mais importante é a segurança do investimento e a qualidade de vida. Concordo totalmente."\n\n🔍 EXPLORAÇÃO\n"Você está buscando para moradia ou como oportunidade de investimento? Tem alguma região preferida em Porto Alegre?"\n\n🏠 PRODUTO\n"Temos o SEEN Três Figueiras com desconto de 36% — de R$ 2,5M por R$ 1,59M. E o Gama, 1375 na Auxiliadora com 29% OFF. São condições que a Melnick só libera uma vez por ano, com negociação direta com a diretoria."\n\n📍 VISITA\n"Posso organizar uma visita privativa ao empreendimento. Que tal esta semana?"\n\n🎯 FECHAMENTO\n"Vou preparar uma apresentação personalizada e te enviar. Qual o melhor canal?"`,
    followup: [
      `{{nome}}, boa tarde! O Melnick Day terá condições exclusivas para alto padrão: descontos de até 36% + negociação direta com a diretoria. Posso agendar uma conversa? 🏢`,
      `{{nome}}, separei uma oportunidade que pode te interessar: SEEN Três Figueiras de R$ 2,5M por R$ 1,59M no Melnick Day (21/03). Quer que eu prepare a análise completa? 📊`,
      `Oi {{nome}}! As condições do Melnick Day são válidas apenas no dia 21/03 e por ordem de reserva. Se tem interesse, é importante nos organizarmos com antecedência. Posso te ajudar? ⏰`,
    ],
  },
  altissimo: {
    ligacao: `📞 ABERTURA\n"{{nome}}, aqui é {{corretor}} da UHome. Preciso compartilhar algo exclusivo com você: o Melnick Day deste ano inclui empreendimentos de altíssimo padrão com condições que normalmente não são oferecidas ao mercado."\n\n🤝 CONEXÃO\n"São projetos como Casa Moinhos, Zayt e Arte Country Club — assinados por arquitetos renomados, em localizações definitivas de Porto Alegre."\n\n🔍 EXPLORAÇÃO\n"Para que eu possa te apresentar a opção mais adequada: você busca algo mais compacto e sofisticado ou uma metragem generosa? O que pensa sobre a região?"\n\n🏠 PRODUTO\n"O Casa Moinhos tem unidades de 292 a 644m² no coração de Moinhos de Vento. O Zayt oferece plantas de 490 a 540m² na Bela Vista. Ambos com negociação direta com a diretoria da Melnick."\n\n📍 VISITA\n"Posso organizar uma apresentação exclusiva com material detalhado e tour pelo local. Quando seria conveniente?"\n\n🎯 FECHAMENTO\n"Vou enviar o book completo dos empreendimentos. Prefere por e-mail ou WhatsApp?"`,
    followup: [
      `{{nome}}, boa tarde. O Melnick Day incluirá projetos exclusivos como Casa Moinhos (292-644m²) e Zayt (490-540m²). Posso preparar uma apresentação personalizada? 🏛️`,
      `{{nome}}, gostaria de compartilhar os detalhes do Arte Country Club — 3 e 4 suítes com até 321m² na Bela Vista. Condições especiais apenas no dia 21/03. Interesse em conhecer? ✨`,
      `{{nome}}, lembrete: imóveis de altíssimo padrão no Melnick Day são limitados e por ordem de reserva. Se há interesse, sugiro agendarmos uma conversa esta semana. 📞`,
    ],
  },
  investimento: {
    ligacao: `📞 ABERTURA\n"{{nome}}, aqui é {{corretor}} da UHome! Estou ligando porque o Melnick Day terá condições excepcionais para investidores — e achei que você deveria saber."\n\n🔍 EXPLORAÇÃO\n"Você investe pensando em renda mensal com aluguel ou valorização patrimonial a médio prazo?"\n\n🏠 PRODUTO\n"Temos studios e compactos a partir de R$ 148 mil, com ITBI e registro pagos pela Melnick + 6 meses de aluguel garantido. São regiões como Bom Fim, Cidade Baixa e Boa Vista — alta demanda de locação."\n\n📍 VISITA\n"Posso te enviar a análise de rentabilidade e agendar uma visita ao decorado. O que acha?"\n\n🎯 FECHAMENTO\n"Qual unidade te interessa mais? Vou reservar um horário para a gente avançar."`,
    followup: [
      `Oi {{nome}}! 📊 No Melnick Day tem studios a partir de R$ 148 mil com ITBI pago + 6 meses de aluguel garantido. Ideal pra renda passiva. Quer ver as opções?`,
      `{{nome}}, separei compactos em regiões com alta demanda de aluguel (Bom Fim, Cidade Baixa). Condições exclusivas do Melnick Day (21/03). Posso te enviar? 🏢`,
      `Oi {{nome}}! Último lembrete: as unidades de investimento do Melnick Day costumam esgotar primeiro. Se quer garantir, me chama que te ajudo! ⏰`,
    ],
  },
};

// ── Helper: desconto % ──
function calcDesconto(de?: string, por?: string): string | null {
  if (!de || !por) return null;
  const parse = (s: string) => parseFloat(s.replace(/[^0-9.,]/g, "").replace(".", "").replace(",", "."));
  const vDe = parse(de);
  const vPor = parse(por);
  if (!vDe || !vPor || vDe <= vPor) return null;
  return Math.round(((vDe - vPor) / vDe) * 100) + "%";
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado!");
}

// ── Components ──

function EmpreendimentoCard({ emp }: { emp: Empreendimento }) {
  const desconto = calcDesconto(emp.precoDe, emp.precoPor);
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/50 group">
      {emp.imagem && (
        <div className="relative h-36 overflow-hidden bg-muted">
          <img src={emp.imagem} alt={emp.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          {desconto && (
            <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
              -{desconto}
            </span>
          )}
          <Badge className="absolute top-2 left-2 text-[10px]" variant="secondary">{emp.status}</Badge>
        </div>
      )}
      <CardContent className="p-3 space-y-1.5">
        <h4 className="font-semibold text-sm text-foreground leading-tight">{emp.nome}</h4>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> {emp.bairro}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Maximize2 className="h-3 w-3" /> {emp.metragens} · {emp.dorms}
        </div>
        {emp.precoPor && (
          <div className="pt-1 border-t border-border/30">
            {emp.precoDe && <p className="text-xs text-muted-foreground line-through">{emp.precoDe}</p>}
            <p className="text-sm font-bold text-emerald-600">{emp.precoPor}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScriptSection({ segKey }: { segKey: string }) {
  const script = SCRIPTS[segKey];
  const [showLigacao, setShowLigacao] = useState(false);
  if (!script) return null;

  return (
    <div className="space-y-3">
      {/* Script de ligação */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowLigacao(!showLigacao)}>
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Script de Ligação
            {showLigacao ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
          </CardTitle>
        </CardHeader>
        {showLigacao && (
          <CardContent className="pt-0">
            <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-lg font-sans leading-relaxed text-foreground/80">
              {script.ligacao}
            </pre>
            <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => copyToClipboard(script.ligacao)}>
              <Copy className="h-3 w-3" /> Copiar Script
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Follow-ups */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-500" />
            Mensagens de Follow-up (WhatsApp)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {script.followup.map((msg, i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
              <p className="text-xs flex-1 text-foreground/80">{msg}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(msg)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Page ──

export default function MelnickDay() {
  const segKeys = Object.keys(SEGMENTOS);

  // Countdown to March 21
  const eventDate = new Date("2026-03-21T09:00:00-03:00");
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  return (
    <div className="space-y-6 pb-24">
      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#0d2137] to-[#1a3a5c] p-6 md:p-8">
        <div className="absolute inset-0 bg-[url('https://wordpress-melnick.s3.sa-east-1.amazonaws.com/wp-content/uploads/2026/03/03122610/banner.png')] bg-cover bg-center opacity-20" />
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500 text-white border-0 text-xs font-bold">21 DE MARÇO</Badge>
            <Badge variant="outline" className="border-white/30 text-white/80 text-xs">15ª Edição</Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            Melnick Day 2026
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            O dia que vai transformar a sua história. Descontos de até <strong className="text-amber-400">40%</strong>, negociação direta com a diretoria, carro como entrada e condições exclusivas.
          </p>
          {diff > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-white font-semibold text-sm">
                {days}d {hours}h para o evento
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => window.open("https://www.melnick.com.br/melnickday/", "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" /> Site Oficial
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-3 border-border/50">
          <p className="text-2xl font-bold text-primary">+30</p>
          <p className="text-[11px] text-muted-foreground">Empreendimentos</p>
        </Card>
        <Card className="text-center p-3 border-border/50">
          <p className="text-2xl font-bold text-emerald-600">Até 40%</p>
          <p className="text-[11px] text-muted-foreground">de Desconto</p>
        </Card>
        <Card className="text-center p-3 border-border/50">
          <p className="text-2xl font-bold text-amber-500">5</p>
          <p className="text-[11px] text-muted-foreground">Segmentos</p>
        </Card>
      </div>

      {/* Condições Gerais */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Condições Gerais do Melnick Day</h3>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• Avaliação acima do mercado na troca</li>
                <li>• Carro como entrada</li>
                <li>• Descontos exclusivos por segmento</li>
                <li>• Negociação direta com a diretoria</li>
                <li>• ITBI/Registro pagos (linha MCMV e Investimento)</li>
                <li>• Aluguel garantido 6 meses (Investimento)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs por Segmento */}
      <Tabs defaultValue="mcmv" className="space-y-4">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {segKeys.map((k) => (
            <TabsTrigger key={k} value={k} className="text-xs flex-1 min-w-[80px]">
              {SEGMENTOS[k].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {segKeys.map((k) => {
          const seg = SEGMENTOS[k];
          return (
            <TabsContent key={k} value={k} className="space-y-4">
              {/* Condições do segmento */}
              <div className={`rounded-lg border px-4 py-2.5 ${seg.cor}`}>
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{seg.condicoes}</span>
                </div>
              </div>

              {/* Empreendimentos Grid */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Empreendimentos ({seg.empreendimentos.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {seg.empreendimentos.map((emp, i) => (
                    <EmpreendimentoCard key={i} emp={emp} />
                  ))}
                </div>
              </div>

              {/* Scripts */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  Scripts de Venda — {seg.label}
                </h3>
                <ScriptSection segKey={k} />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
