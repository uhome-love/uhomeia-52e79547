import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Sparkles, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AvatarGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (url: string) => void;
}

export default function AvatarGeneratorModal({ open, onOpenChange, onGenerated }: AvatarGeneratorModalProps) {
  const { user } = useAuth();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      setGeneratedUrl(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (!photoPreview || !user) return;

    setGenerating(true);
    setError(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const { data, error: fnError } = await supabase.functions.invoke("generate-avatar", {
        body: { photo_url: photoPreview },
      });

      if (fnError) throw new Error(fnError.message || "Erro ao gerar avatar");
      if (data?.error) throw new Error(data.error);

      const url = data?.url;
      if (!url) throw new Error("Nenhuma imagem retornada");

      setGeneratedUrl(url);
      toast.success("Avatar criado com sucesso! 🎮");
      onGenerated(url);
    } catch (err: any) {
      console.error("Avatar generation error:", err);
      const msg = err?.message || "";
      if (msg.includes("Rate limit")) {
        setError("Limite atingido. Tente novamente em alguns minutos.");
      } else if (msg.includes("Créditos")) {
        setError("Créditos insuficientes para gerar avatar.");
      } else {
        setError("Não conseguimos gerar seu avatar. Tente com uma foto mais nítida e bem iluminada.");
      }
    } finally {
      setGenerating(false);
    }
  }

  function handleClose() {
    if (!generating) {
      setPhotoPreview(null);
      setGeneratedUrl(null);
      setError(null);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar seu Avatar com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Photo upload area */}
          {!photoPreview ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/20 p-8 transition-colors"
            >
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Envie sua foto</p>
                <p className="text-xs text-muted-foreground mt-1">Use uma foto nítida, com rosto visível e boa iluminação</p>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-6">
                {/* Original photo */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Sua foto</p>
                  <div className="w-28 h-28 rounded-full overflow-hidden ring-2 ring-border">
                    <img src={photoPreview} alt="Foto enviada" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* Arrow or generated result */}
                {generatedUrl ? (
                  <>
                    <span className="text-2xl text-muted-foreground">→</span>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">Seu avatar</p>
                      <div className="w-28 h-28 rounded-full overflow-hidden ring-2 ring-primary shadow-lg">
                        <img src={generatedUrl} alt="Avatar gerado" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-2xl text-muted-foreground">→</span>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">Avatar IA</p>
                      <div className="w-28 h-28 rounded-full bg-muted/40 flex items-center justify-center ring-2 ring-dashed ring-muted-foreground/20">
                        {generating ? (
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Change photo */}
              {!generating && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null);
                    setGeneratedUrl(null);
                    setError(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Escolher outra foto
                </button>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Generate / retry button */}
          {photoPreview && !generatedUrl && (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando seu avatar... ~15 segundos
                </>
              ) : error ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Tentar novamente
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  ✨ Gerar avatar
                </>
              )}
            </Button>
          )}

          {/* Done */}
          {generatedUrl && (
            <Button onClick={handleClose} className="w-full" size="lg">
              Pronto! Fechar
            </Button>
          )}

          {/* Loading message */}
          {generating && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              A IA está criando seu avatar chibi personalizado...
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
