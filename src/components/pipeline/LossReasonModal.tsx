import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

const MOTIVOS_PERDA = [
  "Preço alto",
  "Localização não agradou",
  "Concorrência (escolheu outro produto)",
  "Crédito não aprovado",
  "Cliente desistiu da compra",
  "Não respondeu mais",
  "Escolheu outro empreendimento nosso",
  "Outro",
] as const;

interface LossReasonModalProps {
  open: boolean;
  leadNome: string;
  onConfirm: (motivo: string, observacoes: string) => void;
  onCancel: () => void;
}

export default function LossReasonModal({ open, leadNome, onConfirm, onCancel }: LossReasonModalProps) {
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");

  const handleConfirm = () => {
    if (!motivo) return;
    onConfirm(motivo, obs);
    setMotivo("");
    setObs("");
  };

  const handleCancel = () => {
    setMotivo("");
    setObs("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Por que este negócio foi perdido?</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {leadNome}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo principal *</label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_PERDA.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Observações adicionais</label>
            <Textarea
              placeholder="Detalhes sobre a perda..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!motivo}
          >
            Confirmar perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
