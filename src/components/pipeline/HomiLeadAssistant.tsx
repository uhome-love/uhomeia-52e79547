import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bot, MessageSquare, ShieldQuestion, Send, FileText, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  leadNome: string;
  leadTelefone?: string | null;
  leadEmail?: string | null;
  empreendimento?: string | null;
  etapa: string;
  temperatura?: string;
  observacoes?: string | null;
}

const ACTIONS = [
  { id: "mensagem", label: "Gerar Mensagem", icon: MessageSquare, prompt: "Gere uma mensagem de WhatsApp personalizada, natural e curta (3-4 linhas máx) para este lead. Termine com uma pergunta estratégica." },
  { id: "objecao", label: "Responder Objeção", icon: ShieldQuestion, prompt: "O cliente apresentou uma objeção. Sugira uma resposta profissional e convincente para o corretor usar." },
  { id: "followup", label: "Criar Follow-up", icon: Send, prompt: "Gere uma mensagem de follow-up para retomar contato com este lead que não respondeu. Seja natural e não pareça spam." },
  { id: "proposta", label: "Gerar Proposta", icon: FileText, prompt: "Crie um texto de proposta comercial para enviar ao cliente, destacando diferenciais do empreendimento." },
];

export default function HomiLeadAssistant({ leadNome, leadTelefone, leadEmail, empreendimento, etapa, temperatura, observacoes }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [objecao, setObjecao] = useState("");

  const handleAction = useCallback(async (actionId: string, extraContext?: string) => {
    if (!user) return;
    setLoading(true);
    setActiveAction(actionId);
    setResult("");

    const action = ACTIONS.find(a => a.id === actionId);
    const context = `
Lead: ${leadNome}
Telefone: ${leadTelefone || "N/A"}
Email: ${leadEmail || "N/A"}
Empreendimento: ${empreendimento || "N/A"}
Etapa do funil: ${etapa}
Temperatura: ${temperatura || "morno"}
Observações: ${observacoes || "Nenhuma"}
${extraContext ? `Contexto adicional: ${extraContext}` : ""}
    `.trim();

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/homi-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `${action?.prompt || customPrompt}\n\nDados do lead:\n${context}` }
          ],
          role: "corretor",
          module: "lead_assistant",
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("Limite de requisições. Tente novamente."); return; }
        if (resp.status === 402) { toast.error("Créditos insuficientes."); return; }
        throw new Error("Erro na IA");
      }

      // Parse SSE
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch { /* partial */ }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar resposta");
    } finally {
      setLoading(false);
    }
  }, [user, leadNome, leadTelefone, leadEmail, empreendimento, etapa, temperatura, observacoes, customPrompt]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success("Texto copiado!");
  };

  return (
    <Card className="p-3 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="text-[11px] font-bold text-primary">Homi AI</h4>
          <p className="text-[9px] text-muted-foreground">Assistente de vendas inteligente</p>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant={activeAction === action.id ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] gap-1 justify-start"
              onClick={() => {
                if (action.id === "objecao" && !objecao) {
                  setActiveAction("objecao_input");
                  return;
                }
                handleAction(action.id, action.id === "objecao" ? objecao : undefined);
              }}
              disabled={loading}
            >
              <Icon className="h-3 w-3 shrink-0" />
              {action.label}
            </Button>
          );
        })}
      </div>

      {/* Objection input */}
      {activeAction === "objecao_input" && (
        <div className="space-y-1.5 mb-3">
          <Textarea
            className="text-xs min-h-[40px]"
            placeholder="Qual objeção o cliente apresentou? Ex: Acho caro, preciso pensar..."
            value={objecao}
            onChange={e => setObjecao(e.target.value)}
          />
          <Button size="sm" className="w-full h-7 text-[10px]" onClick={() => handleAction("objecao", objecao)} disabled={!objecao || loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Gerar Resposta
          </Button>
        </div>
      )}

      {/* Free prompt */}
      {!result && !loading && activeAction !== "objecao_input" && (
        <div className="flex gap-1.5">
          <Textarea
            className="text-xs min-h-[36px] flex-1"
            placeholder="Pergunte algo à IA sobre este lead..."
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            rows={1}
          />
          <Button size="sm" className="h-auto px-2" onClick={() => handleAction("custom")} disabled={!customPrompt || loading}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && !result && (
        <div className="flex items-center justify-center py-4 gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Gerando...</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          <div className="bg-background rounded-lg border border-border p-3 text-xs prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1" onClick={handleCopy}>
              📋 Copiar
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1" onClick={() => { setResult(""); setActiveAction(null); setCustomPrompt(""); }}>
              Nova consulta
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
