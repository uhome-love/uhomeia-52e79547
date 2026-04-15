import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye } from "lucide-react";

export interface CorretorInfo {
  id: string; // profiles.id
  nome: string;
  userId: string; // auth user id
}

interface CorretorSelectorProps {
  corretores: CorretorInfo[];
  selectedCorretorId: string | null;
  onSelect: (corretorId: string | null) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getFirstName(name: string) {
  return name.split(" ")[0] || name;
}

export default function CorretorSelector({
  corretores,
  selectedCorretorId,
  onSelect,
}: CorretorSelectorProps) {
  if (corretores.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-border bg-muted/20 flex-shrink-0 space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Eye size={12} />
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          Visualizando
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {/* Todos chip */}
        <button
          onClick={() => onSelect(null)}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
            selectedCorretorId === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todos
        </button>
        {corretores.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
              selectedCorretorId === c.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-background/50 text-[8px] font-bold shrink-0">
              {getInitials(c.nome)}
            </span>
            {getFirstName(c.nome)}
          </button>
        ))}
      </div>
    </div>
  );
}
