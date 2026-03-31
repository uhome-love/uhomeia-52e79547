import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertCircle, Clock, MessageCircle, Info } from "lucide-react";
import { toast } from "sonner";

interface TemplateInfo {
  name: string;
  description: string;
  parameters: string[];
  status: "unknown" | "testing" | "ok" | "error";
  errorMessage?: string;
}

const SYSTEM_TEMPLATES: TemplateInfo[] = [
  {
    name: "hello_world",
    description: "Template padrão de teste Meta",
    parameters: [],
    status: "unknown",
  },
  {
    name: "reativacao_vitrine",
    description: "Nutrição: vitrine de imóveis para reativação de leads frios",
    parameters: ["nome", "empreendimento"],
    status: "unknown",
  },
  {
    name: "ultima_chance",
    description: "Nutrição: última chance para lead descartado",
    parameters: ["nome", "empreendimento"],
    status: "unknown",
  },
  {
    name: "condicoes_especiais",
    description: "Nutrição: condições especiais / promoção",
    parameters: ["nome", "empreendimento"],
    status: "unknown",
  },
  {
    name: "vitrine_imoveis_personalizada",
    description: "Vitrine de imóveis personalizada com link",
    parameters: ["nome", "titulo", "bairro", "tipo", "preco", "link"],
    status: "unknown",
  },
  {
    name: "sla_urgente",
    description: "Alerta SLA para corretor",
    parameters: ["nome_lead", "empreendimento"],
    status: "unknown",
  },
];

export default function WhatsAppTemplatesManager() {
  const [templates, setTemplates] = useState<TemplateInfo[]>(SYSTEM_TEMPLATES);
  const [testing, setTesting] = useState<string | null>(null);

  const testTemplate = async (templateName: string) => {
    setTesting(templateName);
    setTemplates(prev => prev.map(t =>
      t.name === templateName ? { ...t, status: "testing" as const } : t
    ));

    try {
      // Call whatsapp-send with a dummy phone to validate template existence
      // We use a known test number or check via the API
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          telefone: "5500000000000", // Invalid number — will fail at delivery but validates template
          template: {
            name: templateName,
            language: "pt_BR",
          },
        },
      });

      if (error) {
        setTemplates(prev => prev.map(t =>
          t.name === templateName ? { ...t, status: "error", errorMessage: error.message } : t
        ));
        toast.error(`Template "${templateName}" — erro`, { description: error.message });
      } else if (data?.error) {
        // Check if it's a template-not-found error vs a phone number error
        const isTemplateError = data.error?.includes("template") || data.details?.error?.code === 132012;
        if (isTemplateError) {
          setTemplates(prev => prev.map(t =>
            t.name === templateName ? { ...t, status: "error", errorMessage: "Template não encontrado na Meta" } : t
          ));
          toast.error(`Template "${templateName}" NÃO existe na Meta`);
        } else {
          // Phone error means template was found
          setTemplates(prev => prev.map(t =>
            t.name === templateName ? { ...t, status: "ok" } : t
          ));
          toast.success(`Template "${templateName}" encontrado na Meta ✅`);
        }
      } else {
        setTemplates(prev => prev.map(t =>
          t.name === templateName ? { ...t, status: "ok" } : t
        ));
        toast.success(`Template "${templateName}" validado ✅`);
      }
    } catch (err: any) {
      setTemplates(prev => prev.map(t =>
        t.name === templateName ? { ...t, status: "error", errorMessage: err.message } : t
      ));
    } finally {
      setTesting(null);
    }
  };

  const statusIcon = (status: TemplateInfo["status"]) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "testing": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: TemplateInfo["status"]) => {
    switch (status) {
      case "ok": return <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">Aprovado</Badge>;
      case "error": return <Badge variant="destructive" className="text-[10px]">Não encontrado</Badge>;
      case "testing": return <Badge variant="outline" className="text-[10px]">Testando...</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">Não testado</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">Templates WhatsApp do Sistema</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Templates referenciados pelo sistema de nutrição. Devem existir e estar aprovados na Meta Business Manager.
        </p>

        <ScrollArea className="h-80">
          <div className="space-y-3">
            {templates.map((tpl) => (
              <div key={tpl.name} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {statusIcon(tpl.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{tpl.name}</code>
                        {statusBadge(tpl.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                      {tpl.parameters.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tpl.parameters.map(p => (
                            <Badge key={p} variant="outline" className="text-[9px]">{`{{${p}}}`}</Badge>
                          ))}
                        </div>
                      )}
                      {tpl.status === "error" && tpl.errorMessage && (
                        <p className="text-[10px] text-red-500 mt-1">⚠️ {tpl.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-xs"
                    disabled={testing !== null}
                    onClick={() => testTemplate(tpl.name)}
                  >
                    {testing === tpl.name ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Testar"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Como criar templates na Meta</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Acesse o <strong>Meta Business Manager</strong> → WhatsApp → Gerenciador de Templates</li>
              <li>Crie cada template com o <strong>nome exato</strong> listado acima</li>
              <li>Idioma: <code>pt_BR</code> (Português Brasil)</li>
              <li>Adicione os parâmetros <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code> etc. no corpo do template</li>
              <li>Aguarde aprovação da Meta (pode levar até 24h)</li>
              <li>Volte aqui e clique "Testar" para validar</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
