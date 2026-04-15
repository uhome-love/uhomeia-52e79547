import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, Download, Film, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaRendererProps {
  mediaUrl: string;
  body?: string | null;
  direction: string;
  mediaType?: string | null;
}

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const AUDIO_EXTS = [".ogg", ".mp3", ".m4a", ".wav", ".opus", ".oga"];
const VIDEO_EXTS = [".mp4", ".3gp", ".webm", ".mov"];
const DOC_EXTS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt"];

function getExtension(url: string): string {
  try {
    const path = new URL(url).pathname;
    const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
    return ext || "";
  } catch {
    const ext = url.substring(url.lastIndexOf(".")).split("?")[0].toLowerCase();
    return ext || "";
  }
}

function detectMediaType(url: string, explicitType?: string | null): "image" | "audio" | "video" | "document" | "unknown" {
  // Use explicit media_type from DB if available
  if (explicitType) {
    if (explicitType === "image") return "image";
    if (explicitType === "audio") return "audio";
    if (explicitType === "video") return "video";
    if (explicitType === "document") return "document";
    if (explicitType === "sticker") return "image";
  }

  // Check data: URLs
  if (url.startsWith("data:")) {
    if (url.startsWith("data:image/")) return "image";
    if (url.startsWith("data:audio/")) return "audio";
    if (url.startsWith("data:video/")) return "video";
    if (url.startsWith("data:application/")) return "document";
    return "unknown";
  }

  const ext = getExtension(url);
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (DOC_EXTS.includes(ext)) return "document";
  if (/image/i.test(url)) return "image";
  if (/audio|voice|ptt/i.test(url)) return "audio";
  if (/video/i.test(url)) return "video";
  return "unknown";
}

function getFileName(url: string): string {
  if (url.startsWith("data:")) return "arquivo";
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.substring(path.lastIndexOf("/") + 1)) || "arquivo";
  } catch {
    return "arquivo";
  }
}

function handleDownload(url: string, filename?: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || getFileName(url);
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function MediaRenderer({ mediaUrl, body, direction, mediaType }: MediaRendererProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const type = detectMediaType(mediaUrl, mediaType);
  const isSent = direction === "sent";

  return (
    <div className="space-y-1">
      {type === "image" && (
        <>
          <div className="relative group/media">
            <img
              src={mediaUrl}
              alt="Mídia"
              className="max-w-[240px] max-h-[240px] rounded cursor-pointer object-cover hover:opacity-90 transition-opacity"
              onClick={() => setLightboxOpen(true)}
              loading="lazy"
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(mediaUrl, "imagem"); }}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover/media:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
              title="Baixar"
            >
              <Download size={12} />
            </button>
          </div>
          <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 flex items-center justify-center bg-black/95 border-none">
              <img
                src={mediaUrl}
                alt="Mídia ampliada"
                className="max-w-full max-h-[85vh] object-contain rounded"
              />
              <button
                onClick={() => handleDownload(mediaUrl, "imagem")}
                className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                title="Baixar"
              >
                <Download size={16} />
              </button>
            </DialogContent>
          </Dialog>
        </>
      )}

      {type === "audio" && (
        <div className="flex items-center gap-1.5">
          <audio controls preload="none" className="max-w-[220px] h-8">
            <source src={mediaUrl} />
            Seu navegador não suporta áudio.
          </audio>
          <button
            onClick={() => handleDownload(mediaUrl, "audio")}
            className={`p-1 rounded transition-colors ${
              isSent ? "hover:bg-primary-foreground/10" : "hover:bg-muted"
            }`}
            title="Baixar áudio"
          >
            <Download size={12} className="opacity-60" />
          </button>
        </div>
      )}

      {type === "video" && (
        <div className="relative group/media">
          <video
            controls
            preload="none"
            className="max-w-[240px] max-h-[200px] rounded"
          >
            <source src={mediaUrl} />
            Seu navegador não suporta vídeo.
          </video>
          <button
            onClick={() => handleDownload(mediaUrl, "video")}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover/media:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
            title="Baixar vídeo"
          >
            <Download size={12} />
          </button>
        </div>
      )}

      {type === "document" && (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs transition-colors ${
            isSent
              ? "border-primary-foreground/30 hover:bg-primary-foreground/10"
              : "border-border hover:bg-muted"
          }`}
        >
          <FileText size={16} className="shrink-0" />
          <span className="truncate max-w-[160px]">{getFileName(mediaUrl)}</span>
          <Download size={12} className="shrink-0 ml-auto" />
        </a>
      )}

      {type === "unknown" && (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs transition-colors ${
            isSent
              ? "border-primary-foreground/30 hover:bg-primary-foreground/10"
              : "border-border hover:bg-muted"
          }`}
        >
          <Film size={16} className="shrink-0" />
          <span className="text-xs">📎 Mídia</span>
          <Download size={12} className="shrink-0 ml-auto" />
        </a>
      )}

      {body && body !== "📎 image" && body !== "📎 video" && body !== "📎 audio" && body !== "📎 document" && body !== "📎 sticker" && body !== "🎤 Áudio" && (
        <p className="mt-0.5">{body}</p>
      )}
    </div>
  );
}
