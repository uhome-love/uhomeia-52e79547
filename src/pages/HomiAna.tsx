import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const homiMascot = "/images/homi-mascot-opt.png";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/homi-chat`;

const SUGGESTIONS = [
  "Gera minha rotina semanal de conteúdo",
  "Ideias de reels virais para o Shift",
  "Me ajuda a calcular a pagadoria da venda X",
  "Brief de conteúdo para post do Instagram",
];

const SYSTEM_CONTEXT = `Você é o HOMI Ana — um assistente de backoffice especializado em marketing imobiliário e gestão financeira. Seu tom é criativo, organizado e prático, como um sócio de marketing experiente. Você ajuda a Ana Paula com: 1) Geração de rotinas semanais de conteúdo, 2) Ideias criativas para reels, posts e anúncios, 3) Briefs de conteúdo completos com roteiro, 4) Cálculos de comissões e pagadorias. Responda sempre em português brasileiro. Seja direto e acionável.`;

export default function HomiAna() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const updated: Msg[] = [...messages, { role: "user", content: msg }];
    setMessages(updated);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: updated,
          systemContext: SYSTEM_CONTEXT,
          assistantType: "backoffice",
        }),
      });
      if (!res.ok) throw new Error("Erro na API");
      const data = await res.json();
      setMessages([...updated, { role: "assistant", content: data.reply || data.message || "Sem resposta." }]);
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">🤖 HOMI Ana</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Seu diretor criativo + CFO parceiro. Peça ideias de conteúdo, rotinas semanais ou ajuda com pagadorias.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-12">
              <img src={homiMascot} alt="HOMI Ana" className="h-20 w-20 object-contain" />
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Olá Ana! Sou seu assistente criativo e financeiro. Como posso ajudar hoje?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="text-xs justify-start h-auto py-2 whitespace-normal text-left" onClick={() => send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao HOMI Ana..."
            className="resize-none min-h-[44px] max-h-32 text-sm"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
          />
          <Button size="icon" onClick={() => send()} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
