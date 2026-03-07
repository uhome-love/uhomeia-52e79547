import { useState } from "react";
import { usePipeline } from "@/hooks/usePipeline";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import PipelineAddLeadDialog from "@/components/pipeline/PipelineAddLeadDialog";
import PipelineLeadDetail from "@/components/pipeline/PipelineLeadDetail";
import type { PipelineLead } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Filter, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";

export default function PipelineKanban() {
  const pipeline = usePipeline();
  const { isGestor, isAdmin } = useUserRole();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [filterSegmento, setFilterSegmento] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const canAdd = isGestor || isAdmin;

  const filteredLeads = filterSegmento === "all"
    ? pipeline.leads
    : pipeline.leads.filter(l => l.segmento_id === filterSegmento);

  const handleRefresh = async () => {
    setRefreshing(true);
    await pipeline.reload();
    setRefreshing(false);
  };

  if (pipeline.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Pipeline Comercial
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} no pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro por segmento */}
          <Select value={filterSegmento} onValueChange={setFilterSegmento}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              {pipeline.segmentos.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
                    {s.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          {canAdd && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <PipelineBoard
        stages={pipeline.stages}
        leads={filteredLeads}
        segmentos={pipeline.segmentos}
        onMoveLead={pipeline.moveLead}
        onSelectLead={setSelectedLead}
      />

      {/* Dialogs */}
      {canAdd && (
        <PipelineAddLeadDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          stages={pipeline.stages}
          segmentos={pipeline.segmentos}
          onAdd={pipeline.addLead}
        />
      )}

      {selectedLead && (
        <PipelineLeadDetail
          lead={selectedLead}
          stages={pipeline.stages}
          segmentos={pipeline.segmentos}
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
          onUpdate={pipeline.updateLead}
          onMove={pipeline.moveLead}
        />
      )}
    </div>
  );
}
