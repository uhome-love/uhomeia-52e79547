import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

export type MarketplaceCategory = "script_ligacao" | "whatsapp" | "argumento_empreendimento" | "quebra_objecao" | "template_proposta";
export type MarketplaceStatus = "pendente" | "aprovado" | "rejeitado";
export type MarketplaceSortBy = "mais_usados" | "melhor_avaliados" | "recentes";

export const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  script_ligacao: "📞 Scripts de Ligação",
  whatsapp: "💬 Mensagens WhatsApp",
  argumento_empreendimento: "🏠 Argumentos por Empreendimento",
  quebra_objecao: "🛡️ Quebra de Objeções",
  template_proposta: "📊 Templates de Proposta",
};

export const CATEGORY_ICONS: Record<MarketplaceCategory, string> = {
  script_ligacao: "📞",
  whatsapp: "💬",
  argumento_empreendimento: "🏠",
  quebra_objecao: "🛡️",
  template_proposta: "📊",
};

export function useMarketplace(category?: MarketplaceCategory, sortBy: MarketplaceSortBy = "mais_usados", search?: string) {
  const { user } = useAuth();
  const { isGestor, isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["marketplace-items", category, sortBy, search],
    queryFn: async () => {
      let query = supabase
        .from("marketplace_items")
        .select("*")
        .eq("status", "aprovado");

      if (category) query = query.eq("categoria", category);
      if (search) query = query.ilike("titulo", `%${search}%`);

      if (sortBy === "mais_usados") query = query.order("total_usos", { ascending: false });
      else if (sortBy === "melhor_avaliados") query = query.order("media_avaliacao", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingItems = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["marketplace-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_items")
        .select("*")
        .eq("status", "pendente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isGestor || isAdmin,
  });

  const { data: myItems = [] } = useQuery({
    queryKey: ["marketplace-my-items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_items")
        .select("*")
        .eq("autor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitItem = useMutation({
    mutationFn: async (item: { titulo: string; conteudo: string; categoria: MarketplaceCategory; tags: string[]; origem?: string }) => {
      const { data: profile } = await supabase.from("profiles").select("nome").eq("user_id", user!.id).maybeSingle();
      const { error } = await supabase.from("marketplace_items").insert({
        titulo: item.titulo,
        conteudo: item.conteudo,
        categoria: item.categoria,
        tags: item.tags,
        autor_id: user!.id,
        autor_nome: profile?.nome || "Corretor",
        origem: item.origem || "manual",
        status: (isGestor || isAdmin) ? "aprovado" : "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-my-items"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-pending"] });
      toast.success("Material enviado! " + ((isGestor || isAdmin) ? "Publicado automaticamente." : "Aguardando aprovação do gerente."));
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const approveItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("marketplace_items").update({
        status: "aprovado",
        aprovado_por: user!.id,
        aprovado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-pending"] });
      toast.success("Material aprovado!");
    },
  });

  const rejectItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("marketplace_items").update({
        status: "rejeitado",
        updated_at: new Date().toISOString(),
      }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-pending"] });
      toast.success("Material rejeitado.");
    },
  });

  const useItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.rpc("increment_marketplace_usage", { p_item_id: itemId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-items"] });
    },
  });

  const rateItem = useMutation({
    mutationFn: async ({ itemId, nota, comentario }: { itemId: string; nota: number; comentario?: string }) => {
      const { error } = await supabase.rpc("rate_marketplace_item", {
        p_item_id: itemId,
        p_nota: nota,
        p_comentario: comentario || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-items"] });
      toast.success("Avaliação registrada!");
    },
  });

  // Stats for manager dashboard
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalUsos = items.reduce((s, i) => s + (i.total_usos || 0), 0);
    const avgRating = items.length > 0
      ? (items.reduce((s, i) => s + Number(i.media_avaliacao || 0), 0) / items.length).toFixed(1)
      : "0";
    const topUsed = [...items].sort((a, b) => (b.total_usos || 0) - (a.total_usos || 0)).slice(0, 5);
    const topRated = [...items].sort((a, b) => Number(b.media_avaliacao || 0) - Number(a.media_avaliacao || 0)).slice(0, 5);
    return { totalItems, totalUsos, avgRating, topUsed, topRated, pendingCount: pendingItems.length };
  }, [items, pendingItems]);

  return {
    items,
    pendingItems,
    myItems,
    isLoading,
    pendingLoading,
    submitItem,
    approveItem,
    rejectItem,
    useItem,
    rateItem,
    stats,
  };
}
