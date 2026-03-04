import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const REQUIRED_FIELDS = [
  { key: "nome", label: "Nome", required: true },
  { key: "email", label: "E-mail", required: true },
  { key: "telefone", label: "Telefone", required: true },
  { key: "interesse", label: "Imóvel de Interesse", required: false },
  { key: "origem", label: "Origem do Lead", required: false },
  { key: "ultimoContato", label: "Último Contato", required: false },
  { key: "status", label: "Status", required: false },
] as const;

interface ColumnMapperProps {
  csvHeaders: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
}

export default function ColumnMapper({ csvHeaders, onMappingComplete }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleConfirm = () => {
    onMappingComplete(mapping);
  };

  const requiredMapped = REQUIRED_FIELDS
    .filter((f) => f.required)
    .every((f) => mapping[f.key]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 shadow-card"
    >
      <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
        Mapear colunas
      </h3>
      <p className="mb-2 text-sm text-muted-foreground">
        Associe as colunas do seu CSV aos campos do sistema
      </p>
      <p className="mb-5 text-xs text-muted-foreground">
        * Campos obrigatórios
      </p>

      <div className="space-y-3">
        {REQUIRED_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-sm font-medium text-foreground">
              {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Select
              value={mapping[field.key] || ""}
              onValueChange={(val) =>
                setMapping((prev) => ({ ...prev, [field.key]: val === "__none__" ? "" : val }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {!field.required && (
                  <SelectItem value="__none__" className="text-muted-foreground italic">
                    — Nenhuma —
                  </SelectItem>
                )}
                {csvHeaders.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <Button
        className="mt-6 w-full"
        disabled={!requiredMapped}
        onClick={handleConfirm}
      >
        Importar Leads
      </Button>
    </motion.div>
  );
}
