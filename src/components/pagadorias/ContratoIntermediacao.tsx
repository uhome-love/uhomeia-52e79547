import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";

interface Credor {
  credor_nome: string;
  credor_tipo: string;
  percentual: number;
  valor: number;
}

interface Parcela {
  numero: number;
  data: string;
  valor: number;
}

interface ContractData {
  cliente_nome: string;
  cliente_cpf: string;
  cliente_telefone: string;
  cliente_email: string;
  cliente_endereco: string;
  empreendimento: string;
  unidade: string;
  vgv: number;
  comissao_pct: number;
  comissao_total: number;
  data_venda: string;
  credores: Credor[];
  parcelas: Parcela[];
  corretor_nome: string;
  corretor_cpf: string;
  corretor_creci: string;
  corretor_email: string;
  gerente_nome: string;
  gerente_cpf: string;
  gerente_creci: string;
  gerente_email: string;
  data_assinatura: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: ContractData;
  onDataChange: (d: ContractData) => void;
  onGenerated: () => void;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtR(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDateShort(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

export default function ContratoIntermediacao({ open, onOpenChange, data, onDataChange, onGenerated }: Props) {
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);

  const parcelas = data.parcelas.length > 0 ? data.parcelas : [{ numero: 1, data: data.data_venda, valor: data.comissao_total }];

  const handleDownload = async () => {
    if (!contractRef.current) return;
    setGenerating(true);
    try {
      const element = contractRef.current;
      await html2pdf()
        .set({
          margin: [20, 25, 20, 25],
          filename: `Intermediacao_${data.cliente_nome.replace(/\s+/g, "_")}_${data.empreendimento.replace(/\s+/g, "_")}_${data.unidade || "SN"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(element)
        .save();
      onGenerated();
      toast.success("PDF gerado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const contratados = [] as { nome: string; cpf: string; creci: string; email: string; tipo: string }[];
  if (data.corretor_nome) contratados.push({ nome: data.corretor_nome, cpf: data.corretor_cpf, creci: data.corretor_creci, email: data.corretor_email, tipo: "Corretor(a)" });
  if (data.gerente_nome) contratados.push({ nome: data.gerente_nome, cpf: data.gerente_cpf, creci: data.gerente_creci, email: data.gerente_email, tipo: "Gerente/Corretor(a)" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📄 Contrato de Intermediação Imobiliária</DialogTitle>
        </DialogHeader>

        {/* Edit mode */}
        {editing && (
          <div className="space-y-3 border-b pb-4 mb-4">
            <p className="text-sm font-semibold text-muted-foreground">✏️ Editar dados antes de gerar</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nome do cliente</Label><Input value={data.cliente_nome} onChange={e => onDataChange({ ...data, cliente_nome: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">CPF do cliente</Label><Input value={data.cliente_cpf} onChange={e => onDataChange({ ...data, cliente_cpf: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Endereço do cliente</Label><Input value={data.cliente_endereco} onChange={e => onDataChange({ ...data, cliente_endereco: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Telefone do cliente</Label><Input value={data.cliente_telefone} onChange={e => onDataChange({ ...data, cliente_telefone: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Corretor - Nome</Label><Input value={data.corretor_nome} onChange={e => onDataChange({ ...data, corretor_nome: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Corretor - CPF</Label><Input value={data.corretor_cpf} onChange={e => onDataChange({ ...data, corretor_cpf: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Corretor - CRECI</Label><Input value={data.corretor_creci} onChange={e => onDataChange({ ...data, corretor_creci: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Gerente - Nome</Label><Input value={data.gerente_nome} onChange={e => onDataChange({ ...data, gerente_nome: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Gerente - CPF</Label><Input value={data.gerente_cpf} onChange={e => onDataChange({ ...data, gerente_cpf: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Gerente - CRECI</Label><Input value={data.gerente_creci} onChange={e => onDataChange({ ...data, gerente_creci: e.target.value })} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Data de assinatura</Label><Input type="date" value={data.data_assinatura} onChange={e => onDataChange({ ...data, data_assinatura: e.target.value })} className="h-8 text-sm" /></div>
            </div>
            <Button size="sm" onClick={() => setEditing(false)}>Aplicar alterações</Button>
          </div>
        )}

        {/* Contract preview */}
        <div ref={contractRef} style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11px", lineHeight: "1.6", color: "#000", background: "#fff", padding: "10px" }}>
          {/* LOGO */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <img src="/images/uhomesales-logo.png" alt="UHome" style={{ height: "50px" }} crossOrigin="anonymous" />
          </div>

          {/* TITLE */}
          <h1 style={{ textAlign: "center", fontSize: "14px", fontWeight: "bold", marginBottom: "20px", textTransform: "uppercase" }}>
            Instrumento Particular de Intermediação Imobiliária
          </h1>

          {/* CONTRATANTE */}
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            Pelo presente instrumento particular, de um lado, como <b>CONTRATANTE</b>:{" "}
            <b>{data.cliente_nome || "_______________"}</b>, CPF nº <b>{data.cliente_cpf || "___.___.___-__"}</b>,
            telefone {data.cliente_telefone || "(__) _____-____"}, e-mail {data.cliente_email || "________________"},
            residente em {data.cliente_endereco || "________________________________"}.
          </p>

          {/* CONTRATADOS */}
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            E, de outro lado, como <b>CONTRATADOS</b>:
          </p>
          {contratados.map((c, i) => (
            <p key={i} style={{ textAlign: "justify", marginBottom: "6px", marginLeft: "20px" }}>
              {i + 1}. <b>{c.nome}</b>, {c.tipo}, CPF nº {c.cpf || "___.___.___-__"}, CRECI nº {c.creci || "______"},
              e-mail {c.email || "________________"};
            </p>
          ))}
          <p style={{ textAlign: "justify", marginBottom: "12px", marginLeft: "20px" }}>
            {contratados.length + 1}. <b>UHOME NEGÓCIOS IMOBILIÁRIOS</b>, CNPJ 37.900.790/0001-71, CRECI 25.682-J,
            com sede na Avenida João Wallig, nº 573, Loja 01, Bairro Passo d'Areia, Porto Alegre/RS, CEP 91340-000,
            representada por <b>LUCAS SOUTO DE MORAES SARMENTO</b>, CPF 863.851.860-91, CRECI 58.516, lucas@uhome.imb.br.
          </p>

          {/* CLAUSULA 1 */}
          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>CLÁUSULA 1ª – DO OBJETO</b>
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            O presente contrato tem por objeto a prestação de serviços de intermediação imobiliária pelos CONTRATADOS ao CONTRATANTE,
            referente à aquisição da unidade autônoma abaixo descrita:
          </p>
          <p style={{ textAlign: "justify", marginBottom: "6px", marginLeft: "20px" }}>
            <b>EMPREENDIMENTO:</b> {data.empreendimento || "_______________"}
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px", marginLeft: "20px" }}>
            <b>UNIDADE:</b> {data.unidade || "___"}
          </p>

          {/* CLAUSULA 2 */}
          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>CLÁUSULA 2ª – DA REMUNERAÇÃO</b>
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            A título de remuneração pelos serviços prestados, o CONTRATANTE pagará aos CONTRATADOS o valor total de{" "}
            <b>{fmtR(data.comissao_total)}</b> ({data.comissao_pct}% sobre o VGV de {fmtR(data.vgv)}), conforme distribuição abaixo:
          </p>

          {/* TABLE CREDORES */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "10px" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "left", background: "#f0f0f0" }}>Credor</th>
                <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", background: "#f0f0f0" }}>Valor Total</th>
                {parcelas.map((p, i) => (
                  <th key={i} style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", background: "#f0f0f0" }}>
                    Parcela {p.numero} ({fmtDateShort(p.data)})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.credores.filter(c => c.percentual > 0).map((c, i) => (
                <tr key={i}>
                  <td style={{ border: "1px solid #333", padding: "4px 6px" }}>{c.credor_nome || c.credor_tipo}</td>
                  <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>{fmtR(c.valor)}</td>
                  {parcelas.map((p, j) => (
                    <td key={j} style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>
                      {fmtR(c.valor / parcelas.length)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ fontWeight: "bold" }}>
                <td style={{ border: "1px solid #333", padding: "4px 6px" }}>TOTAL</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>{fmtR(data.comissao_total)}</td>
                {parcelas.map((_, j) => (
                  <td key={j} style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>
                    {fmtR(data.comissao_total / parcelas.length)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* 2.1 */}
          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>2.1.</b> O pagamento será realizado da seguinte forma:
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", fontSize: "10px" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "left", background: "#f0f0f0" }}>Forma</th>
                <th style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", background: "#f0f0f0" }}>Destinatário</th>
                {parcelas.map((p, i) => (
                  <th key={i} style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center", background: "#f0f0f0" }}>
                    {fmtDateShort(p.data)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #333", padding: "4px 6px" }}>Agilitas / Boleto</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>Corretores</td>
                {parcelas.map((_, j) => {
                  const corretoresVal = data.credores
                    .filter(c => c.credor_tipo === "corretor" || c.credor_tipo === "gerente")
                    .reduce((s, c) => s + c.valor, 0);
                  return <td key={j} style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>{fmtR(corretoresVal / parcelas.length)}</td>;
                })}
              </tr>
              <tr>
                <td style={{ border: "1px solid #333", padding: "4px 6px" }}>UHome / Pix ou Boleto</td>
                <td style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>UHome + Outros</td>
                {parcelas.map((_, j) => {
                  const uhomeVal = data.credores
                    .filter(c => c.credor_tipo !== "corretor" && c.credor_tipo !== "gerente")
                    .reduce((s, c) => s + c.valor, 0);
                  return <td key={j} style={{ border: "1px solid #333", padding: "4px 6px", textAlign: "center" }}>{fmtR(uhomeVal / parcelas.length)}</td>;
                })}
              </tr>
            </tbody>
          </table>

          {/* CLAUSULAS 2.2-7 */}
          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>2.2.</b> Em caso de distrato do negócio imobiliário por qualquer motivo, o CONTRATANTE fica obrigado a pagar aos CONTRATADOS
            o valor proporcional aos serviços já prestados, não inferior a 50% (cinquenta por cento) do valor total da remuneração pactuada.
          </p>

          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>CLÁUSULA 3ª – DA VIGÊNCIA</b>
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            O presente contrato vigorará até a conclusão definitiva do negócio imobiliário intermediado, incluindo a lavratura da escritura
            pública ou o registro do contrato de promessa de compra e venda junto ao Cartório de Registro de Imóveis competente.
          </p>

          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>CLÁUSULA 4ª – DAS OBRIGAÇÕES DO CONTRATANTE</b>
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            4.1. Fornecer aos CONTRATADOS todas as informações e documentos necessários para a intermediação do negócio.<br />
            4.2. Não contratar, direta ou indiretamente, outros intermediários para o mesmo negócio durante a vigência deste contrato.<br />
            4.3. Comunicar imediatamente aos CONTRATADOS qualquer alteração nas condições do negócio.
          </p>

          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>CLÁUSULA 5ª – DAS OBRIGAÇÕES DOS CONTRATADOS</b>
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            5.1. Prestar os serviços de intermediação com zelo, diligência e boa-fé.<br />
            5.2. Manter sigilo sobre as informações do CONTRATANTE e do negócio intermediado.<br />
            5.3. Fornecer ao CONTRATANTE todas as informações relevantes sobre o imóvel e a negociação.
          </p>

          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>CLÁUSULA 6ª – DA RESCISÃO</b>
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação por escrito com antecedência mínima de
            30 (trinta) dias, ficando assegurado aos CONTRATADOS o recebimento da remuneração proporcional aos serviços já prestados.
          </p>

          <p style={{ textAlign: "justify", marginBottom: "6px" }}>
            <b>CLÁUSULA 7ª – DO FORO</b>
          </p>
          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            As partes elegem o foro da Comarca de Porto Alegre/RS para dirimir quaisquer dúvidas ou controvérsias decorrentes
            do presente contrato, renunciando a qualquer outro, por mais privilegiado que seja.
          </p>

          {/* PAGE BREAK before signatures */}
          <div style={{ pageBreakBefore: "always" }}></div>

          {/* DATE & SIGNATURES */}
          <p style={{ textAlign: "center", marginTop: "30px", marginBottom: "40px" }}>
            Porto Alegre, {formatDate(data.data_assinatura)}.
          </p>

          <div style={{ marginTop: "40px" }}>
            <div style={{ borderTop: "1px solid #000", width: "60%", margin: "40px auto 5px auto" }}></div>
            <p style={{ textAlign: "center", marginBottom: "5px" }}><b>CONTRATANTE:</b> {data.cliente_nome}</p>
            <p style={{ textAlign: "center", marginBottom: "30px", fontSize: "10px" }}>CPF: {data.cliente_cpf || "___.___.___-__"}</p>

            {contratados.map((c, i) => (
              <div key={i}>
                <div style={{ borderTop: "1px solid #000", width: "60%", margin: "30px auto 5px auto" }}></div>
                <p style={{ textAlign: "center", marginBottom: "5px" }}><b>CONTRATADO {c.tipo.toUpperCase()}:</b> {c.nome}</p>
                <p style={{ textAlign: "center", marginBottom: "30px", fontSize: "10px" }}>CPF: {c.cpf || "___.___.___-__"} · CRECI: {c.creci || "______"}</p>
              </div>
            ))}

            <div style={{ borderTop: "1px solid #000", width: "60%", margin: "30px auto 5px auto" }}></div>
            <p style={{ textAlign: "center", marginBottom: "5px" }}><b>CONTRATADO IMOBILIÁRIA:</b> UHOME NEGÓCIOS IMOBILIÁRIOS</p>
            <p style={{ textAlign: "center", marginBottom: "30px", fontSize: "10px" }}>CNPJ: 37.900.790/0001-71 · CRECI: 25.682-J</p>
          </div>

          {/* TESTEMUNHAS */}
          <div style={{ marginTop: "40px" }}>
            <p style={{ marginBottom: "10px" }}><b>TESTEMUNHAS:</b></p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ width: "45%" }}>
                <div style={{ borderTop: "1px solid #000", marginTop: "30px", marginBottom: "5px" }}></div>
                <p style={{ fontSize: "10px" }}>01. Ana Paula Silveira</p>
                <p style={{ fontSize: "9px" }}>anapsilveiram@gmail.com</p>
              </div>
              <div style={{ width: "45%" }}>
                <div style={{ borderTop: "1px solid #000", marginTop: "30px", marginBottom: "5px" }}></div>
                <p style={{ fontSize: "10px" }}>02. Bruno Schuler</p>
                <p style={{ fontSize: "9px" }}>bruno@uhome.imb.br</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            <Pencil className="h-4 w-4 mr-1" /> {editing ? "Fechar edição" : "Editar dados"}
          </Button>
          <Button onClick={handleDownload} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
            Baixar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
