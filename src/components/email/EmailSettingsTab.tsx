import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings } from "lucide-react";
import { useEmailSettings } from "@/hooks/useEmail";

export default function EmailSettingsTab() {
  const { settings, loading, updateSetting } = useEmailSettings();
  const [editing, setEditing] = useState<Record<string, string>>({});

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const fields = [
    { key: "mailgun_domain", label: "Domínio Mailgun", type: "text" },
    { key: "mailgun_base_url", label: "Base URL da API", type: "text" },
    { key: "mailgun_from", label: "Remetente padrão (From)", type: "text" },
    { key: "mailgun_reply_to", label: "Reply-To padrão", type: "text" },
    { key: "webhook_signing_key", label: "Webhook Signing Key", type: "password" },
  ];

  const toggles = [
    { key: "tracking_opens", label: "Rastrear aberturas" },
    { key: "tracking_clicks", label: "Rastrear cliques" },
    { key: "tracking_unsubscribe", label: "Rastrear descadastros" },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Settings className="h-4 w-4" /> Configuração Mailgun</h3>
        {fields.map(f => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            <div className="flex gap-2">
              <Input
                type={f.type}
                value={editing[f.key] ?? settings[f.key] ?? ""}
                onChange={e => setEditing(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="text-sm"
              />
              {editing[f.key] !== undefined && editing[f.key] !== settings[f.key] && (
                <Button size="sm" onClick={() => { updateSetting(f.key, editing[f.key]); setEditing(prev => { const n = { ...prev }; delete n[f.key]; return n; }); }}>
                  Salvar
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-sm">Tracking</h3>
        {toggles.map(t => (
          <div key={t.key} className="flex items-center justify-between">
            <Label className="text-sm">{t.label}</Label>
            <Switch
              checked={settings[t.key] === "true"}
              onCheckedChange={v => updateSetting(t.key, v ? "true" : "false")}
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
