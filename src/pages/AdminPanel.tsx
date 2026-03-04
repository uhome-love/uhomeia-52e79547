import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, UserPlus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useUserRole";

interface UserWithRole {
  user_id: string;
  email: string;
  nome: string;
  roles: AppRole[];
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRole, setAddingRole] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // Get profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id, nome, email");
    // Get all roles (admin can see all)
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    if (profiles) {
      const userMap = new Map<string, UserWithRole>();
      profiles.forEach((p) => {
        userMap.set(p.user_id, { user_id: p.user_id, email: p.email || "", nome: p.nome || "", roles: [] });
      });
      roles?.forEach((r) => {
        const u = userMap.get(r.user_id);
        if (u) u.roles.push(r.role as AppRole);
      });
      setUsers(Array.from(userMap.values()));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const addRole = useCallback(async (userId: string, role: AppRole) => {
    setAddingRole(userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      if (error.code === "23505") toast.info("Usuário já possui esse papel.");
      else toast.error("Erro ao adicionar papel.");
    } else {
      toast.success("Papel adicionado!");
      fetchUsers();
    }
    setAddingRole(null);
  }, [fetchUsers]);

  const removeRole = useCallback(async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) toast.error("Erro ao remover papel.");
    else { toast.success("Papel removido!"); fetchUsers(); }
  }, [fetchUsers]);

  const roleBadgeColor: Record<AppRole, string> = {
    admin: "bg-destructive/10 text-destructive border-destructive/20",
    gestor: "bg-primary/10 text-primary border-primary/20",
    corretor: "bg-accent/10 text-accent border-accent/20",
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="font-display text-xl font-bold text-foreground">Administração de Usuários</h2>
        </div>
        <p className="text-sm text-muted-foreground">Gerencie papéis e permissões dos usuários do sistema</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card shadow-card"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{user.nome || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {user.roles.map((role) => (
                    <Badge key={role} variant="outline" className={`${roleBadgeColor[role]} text-xs gap-1`}>
                      {role === "admin" ? "🛡️" : role === "gestor" ? "📊" : "👤"} {role}
                      <button onClick={() => removeRole(user.user_id, role)} className="ml-0.5 hover:text-destructive">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <Select onValueChange={(v) => addRole(user.user_id, v as AppRole)} disabled={addingRole === user.user_id}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Adicionar papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">🛡️ Admin</SelectItem>
                  <SelectItem value="gestor">📊 Gestor</SelectItem>
                  <SelectItem value="corretor">👤 Corretor</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          ))}
          {users.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
