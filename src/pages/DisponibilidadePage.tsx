import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DisponibilidadeGerencialPanel from "@/components/disponibilidade/DisponibilidadeGerencialPanel";
import PendingLeadsPanel from "@/components/pipeline/PendingLeadsPanel";
import DistributionDashboard from "@/components/pipeline/DistributionDashboard";
import { RotateCw, AlertTriangle, BarChart3, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DisponibilidadePage() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <PageHeader
        title="Motor de Distribuição de Leads"
        subtitle="Roleta inteligente, leads pendentes e performance de atendimento"
        icon={<CalendarCheck size={18} strokeWidth={1.5} />}
      />

      <Tabs defaultValue="roleta" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roleta" className="gap-1.5">
            <RotateCw className="h-3.5 w-3.5" />
            Roleta
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roleta">
          <DisponibilidadeGerencialPanel />
        </TabsContent>

        <TabsContent value="pendentes">
          <PendingLeadsPanel />
        </TabsContent>

        <TabsContent value="performance">
          <DistributionDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
