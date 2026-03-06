import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";
import type { PdnEntry } from "@/hooks/usePdn";

export function useCorretorPdn(selectedMes?: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PdnEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMes = selectedMes || format(new Date(), "yyyy-MM");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_corretor_pdn", {
      p_mes: currentMes,
    });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar seus negócios");
    }
    setEntries((data as PdnEntry[]) || []);
    setLoading(false);
  }, [user, currentMes]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = {
    total: entries.length,
    total_visitas: entries.filter((e) => e.situacao === "visita").length,
    total_gerados: entries.filter((e) => e.situacao === "gerado").length,
    total_assinados: entries.filter((e) => e.situacao === "assinado").length,
    total_caidos: entries.filter((e) => e.situacao === "caiu").length,
    vgv_gerado: entries
      .filter((e) => e.situacao === "gerado")
      .reduce((s, e) => s + (e.vgv || 0), 0),
    vgv_assinado: entries
      .filter((e) => e.situacao === "assinado")
      .reduce((s, e) => s + (e.vgv || 0), 0),
  };

  return { entries, loading, stats, currentMes, reload: load };
}
