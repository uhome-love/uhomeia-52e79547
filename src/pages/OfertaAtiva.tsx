import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Upload, Settings, FileText, Activity } from "lucide-react";
import ImportListPanel from "@/components/oferta-ativa/ImportListPanel";
import CampaignManager from "@/components/oferta-ativa/CampaignManager";
import TemplateManager from "@/components/oferta-ativa/TemplateManager";
import PerformanceLivePanel from "@/components/oferta-ativa/PerformanceLivePanel";

export default function OfertaAtiva() {
  const [activeTab, setActiveTab] = useState("performance");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Phone className="h-6 w-6 text-primary" />
          Oferta Ativa — Gestão
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importação de listas, campanhas e templates de scripts
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="performance" className="gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" /> Live
          </TabsTrigger>
          <TabsTrigger value="importar" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" /> Importar
          </TabsTrigger>
          <TabsTrigger value="campanhas" className="gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" /> Campanhas
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <PerformanceLivePanel />
        </TabsContent>
        <TabsContent value="importar">
          <ImportListPanel />
        </TabsContent>
        <TabsContent value="campanhas">
          <CampaignManager />
        </TabsContent>
        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
