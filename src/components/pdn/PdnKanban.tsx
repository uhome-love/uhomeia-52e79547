import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { type PdnEntry, type PdnSituacao } from "@/hooks/usePdn";
import PdnCard from "./PdnCard";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, TrendingUp, AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";

interface Props {
  entries: PdnEntry[];
  readOnly?: boolean;
  onUpdate: (id: string, updates: Record<string, any>) => void;
  searchTerm: string;
  filterCorretor: string;
}

const COLUMNS: { key: PdnSituacao; label: string; emoji: string; color: string; headerBg: string; dotColor: string }[] = [
  { key: "visita", label: "Negócios", emoji: "📋", color: "hsl(var(--primary))", headerBg: "bg-primary/5", dotColor: "bg-primary" },
  { key: "gerado", label: "Gerados", emoji: "📄", color: "#f59e0b", headerBg: "bg-amber-500/5", dotColor: "bg-amber-500" },
  { key: "assinado", label: "Assinados", emoji: "✅", color: "#10b981", headerBg: "bg-emerald-500/5", dotColor: "bg-emerald-500" },
  { key: "caiu", label: "Caiu", emoji: "❌", color: "#ef4444", headerBg: "bg-red-500/5", dotColor: "bg-red-500" },
];

const COLUMN_WIDTH_DESKTOP = 320;
const COLUMN_WIDTH_MOBILE = 290;
const COLUMN_GAP = 12;

function getColumnWidth() {
  return typeof window !== "undefined" && window.innerWidth < 640 ? COLUMN_WIDTH_MOBILE : COLUMN_WIDTH_DESKTOP;
}

function formatVGV(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}mil`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export default function PdnKanban({ entries, readOnly, onUpdate, searchTerm, filterCorretor }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<PdnSituacao | null>(null);
  const dragRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Filter once
  const filtered = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return entries.filter(e => {
      if (search && !e.nome.toLowerCase().includes(search)) return false;
      if (filterCorretor && e.corretor !== filterCorretor) return false;
      return true;
    });
  }, [entries, searchTerm, filterCorretor]);

  // Group + compute stats in one pass
  const grouped = useMemo(() => {
    const now = new Date();
    const buckets: Record<PdnSituacao, PdnEntry[]> = { visita: [], gerado: [], assinado: [], caiu: [] };
    for (const e of filtered) {
      buckets[e.situacao]?.push(e);
    }
    return COLUMNS.map(col => {
      const items = buckets[col.key] || [];
      let totalVgv = 0;
      let alertCount = 0;
      let hasParados = false;
      for (const e of items) {
        totalVgv += e.vgv || 0;
        if (col.key !== "caiu" && col.key !== "assinado") {
          const days = differenceInDays(now, new Date(e.updated_at));
          if (days >= 5) { alertCount++; hasParados = true; }
          else if (!e.proxima_acao || !e.proxima_acao.trim()) alertCount++;
        }
      }
      return { ...col, items, totalVgv, alertCount, hasParados };
    });
  }, [filtered]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    const colW = getColumnWidth();
    const idx = Math.round(el.scrollLeft / (colW + COLUMN_GAP));
    setActiveIndex(Math.min(idx, COLUMNS.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollTo = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const colW = getColumnWidth();
    el.scrollBy({ left: direction === "left" ? -(colW + COLUMN_GAP) : (colW + COLUMN_GAP), behavior: "smooth" });
  }, []);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * (getColumnWidth() + COLUMN_GAP), behavior: "smooth" });
  }, []);

  // Stable DnD handlers
  const handleDragStart = useCallback((id: string) => {
    dragRef.current = id;
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, col: PdnSituacao) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(col);
  }, [readOnly]);

  const handleDrop = useCallback((e: React.DragEvent, targetSituacao: PdnSituacao) => {
    e.preventDefault();
    setDragOverCol(null);
    setDraggedId(null);
    const id = dragRef.current;
    if (!id || readOnly) return;
    const entry = entries.find(en => en.id === id);
    if (!entry || entry.situacao === targetSituacao) return;
    onUpdate(id, { situacao: targetSituacao, ...(targetSituacao !== "caiu" ? { motivo_queda: null } : {}) });
    dragRef.current = null;
  }, [readOnly, entries, onUpdate]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverCol(null);
    dragRef.current = null;
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex flex-col h-full w-full max-w-full min-w-0 overflow-hidden">
        {/* Nav pills */}
        <div className="shrink-0 flex items-center gap-1 mb-2 px-1 overflow-x-auto scrollbar-none">
          {grouped.map((col, idx) => (
            <button
              key={col.key}
              onClick={() => scrollToIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 border ${
                idx === activeIndex
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${col.dotColor}`} />
              <span>{col.emoji} {col.label}</span>
              <Badge variant="secondary" className={`text-[9px] px-1 py-0 h-3.5 font-bold ${idx === activeIndex ? "bg-white/20 text-primary-foreground" : ""}`}>
                {col.items.length}
              </Badge>
            </button>
          ))}
        </div>

        {/* Kanban board */}
        <div className="relative flex-1 min-h-0">
          {canScrollLeft && (
            <button
              onClick={() => scrollTo("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-card/95 border border-border shadow-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 backdrop-blur-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scrollTo("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-card/95 border border-border shadow-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 backdrop-blur-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-3 h-full overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-none"
            style={{ scrollSnapType: "x proximity", minHeight: "500px" }}
          >
            {grouped.map((col) => {
              const isDragOver = dragOverCol === col.key;
              return (
                <div
                  key={col.key}
                  className={`flex flex-col shrink-0 h-full rounded-xl transition-all duration-200 ${
                    isDragOver
                      ? "ring-2 ring-primary/50 bg-primary/5 shadow-xl shadow-primary/10 scale-[1.01]"
                      : "bg-muted/20"
                  }`}
                  style={{ width: `${getColumnWidth()}px`, scrollSnapAlign: "start" }}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {/* Column header */}
                  <div className={`shrink-0 px-3.5 py-3 bg-card border border-border/40 rounded-t-xl ${col.headerBg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-3 w-1 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-xs font-bold text-foreground tracking-tight">
                        {col.emoji} {col.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-bold gap-1">
                        {col.items.length} <span className="font-normal text-muted-foreground">negócios</span>
                      </Badge>
                      {col.totalVgv > 0 && (
                        <span className="text-[10px] font-semibold text-foreground flex items-center gap-0.5">
                          <TrendingUp className="h-2.5 w-2.5 text-primary" />
                          {formatVGV(col.totalVgv)}
                        </span>
                      )}
                      {col.alertCount > 0 && (
                        <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                          col.hasParados ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                        }`}>
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {col.alertCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 scrollbar-thin">
                    {col.items.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
                          <span className="text-muted-foreground/40 text-sm">+</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground/50">
                          {readOnly ? "Nenhum registro" : "Arraste cards aqui"}
                        </span>
                      </div>
                    )}
                    {col.items.map((entry) => (
                      <PdnCard
                        key={entry.id}
                        entry={entry}
                        readOnly={readOnly}
                        onUpdate={onUpdate}
                        onDragStart={() => handleDragStart(entry.id)}
                        onDragEnd={handleDragEnd}
                        isDragged={draggedId === entry.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
