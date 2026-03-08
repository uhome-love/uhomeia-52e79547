import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Home, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLevel, getLevelProgress } from "@/lib/gamification";

const homiMascot = "/images/homi-mascot-opt.png";

export interface ArenaSessionData {
  tentativas: number;
  aproveitados: number;
  visitasMarcadas: number;
  pontos: number;
  metaLigacoes: number;
  metaAproveitados: number;
  metaVisitas: number;
  empreendimento: string;
  streak?: number;
}

interface Props {
  data: ArenaSessionData;
  onNewSession: () => void;
  onDashboard: () => void;
}

/* ─── Animated counter ─── */
function useCountUp(target: number, duration: number, startDelay: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [target, duration, startDelay]);
  return value;
}

/* ─── Confetti particle ─── */
function Confetti({ count }: { count: number }) {
  const colors = ["#22C55E", "#3B82F6", "#F59E0B", "#FFFFFF", "#A78BFA", "#F97316"];
  return (
    <div className="fixed inset-0 pointer-events-none z-[101] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${5 + Math.random() * 10}%`,
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            backgroundColor: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `confettiFall ${2 + Math.random() * 2}s ${Math.random() * 0.5}s ease-in forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  emoji,
  label,
  value,
  meta,
  metaLabel,
  delay,
}: {
  emoji: string;
  label: string;
  value: number;
  meta?: number;
  metaLabel?: string;
  delay: number;
}) {
  const animatedValue = useCountUp(value, 1200, delay);
  const metPct = meta ? Math.min(100, Math.round((value / Math.max(1, meta)) * 100)) : null;
  const color =
    metPct === null
      ? "text-blue-400"
      : metPct >= 100
        ? "text-emerald-400"
        : metPct >= 50
          ? "text-amber-400"
          : value === 0
            ? "text-red-400"
            : "text-amber-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay / 1000, duration: 0.4, type: "spring", stiffness: 200 }}
      className="rounded-2xl p-6 text-center"
      style={{
        background: "#1C2128",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <p className="text-sm text-neutral-400 mb-2">
        {emoji} {label}
      </p>
      <p className={`text-5xl font-black ${color}`}>{animatedValue}</p>
      {meta !== undefined && (
        <p className="text-xs text-neutral-500 mt-2">
          de {meta} {metaLabel || "meta"}
        </p>
      )}
    </motion.div>
  );
}

/* ─── HOMI Message ─── */
function getHomiMessage(data: ArenaSessionData): string {
  const ligPct = (data.tentativas / Math.max(1, data.metaLigacoes)) * 100;
  const aprvPct = (data.aproveitados / Math.max(1, data.metaAproveitados)) * 100;
  const best = Math.max(ligPct, aprvPct);

  if (best >= 100)
    return `🔥 INCRÍVEL! Você dominou a arena hoje!\n${data.aproveitados} aproveitamento${data.aproveitados !== 1 ? "s" : ""} é resultado de quem executa!`;
  if (best >= 50)
    return `💪 Bom trabalho! ${data.tentativas} ligações não é pouca coisa.\nAmanhã a gente vai além!`;
  return `⚡ Todo campeão tem dias difíceis.\nO importante é ter entrado na arena. Volta amanhã!`;
}

/* ─── CSS ─── */
const summaryStyles = `
@keyframes confettiFall {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes xpFill {
  from { width: 0; }
}
@keyframes xpGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.4); }
  50%      { box-shadow: 0 0 20px rgba(59,130,246,0.7); }
}
`;

export default function ArenaSessionSummary({ data, onNewSession, onDashboard }: Props) {
  const [phase, setPhase] = useState(0);
  const level = getLevel(data.pontos);
  const levelProgress = getLevelProgress(data.pontos);
  const xpAnimated = useCountUp(data.pontos, 1500, 2000);

  const metAny =
    data.tentativas >= data.metaLigacoes ||
    data.aproveitados >= data.metaAproveitados ||
    data.visitasMarcadas >= data.metaVisitas;

  // Phase progression
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),   // title
      setTimeout(() => setPhase(2), 600),   // stats
      setTimeout(() => setPhase(3), 2000),  // xp bar
      setTimeout(() => setPhase(4), 2800),  // achievements
      setTimeout(() => setPhase(5), 3200),  // homi
      setTimeout(() => setPhase(6), 4000),  // buttons
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const homiMsg = getHomiMessage(data);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-y-auto"
      style={{ background: "#0A0F1E" }}
    >
      <style>{summaryStyles}</style>

      {/* Confetti if met any goal */}
      {metAny && phase >= 2 && <Confetti count={60} />}

      {/* Radial glow */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-xl px-6 py-8 space-y-8">
        {/* PHASE 1: Title */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 1.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 15 }}
              className="text-center"
            >
              <h1
                className="text-4xl sm:text-5xl font-black tracking-widest uppercase"
                style={{
                  background: "linear-gradient(90deg, #22C55E, #3B82F6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SESSÃO ENCERRADA
              </h1>
              <p className="text-sm text-neutral-500 mt-2">
                {data.empreendimento} · {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASE 2: Stats */}
        {phase >= 2 && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard emoji="🔥" label="LIGAÇÕES" value={data.tentativas} meta={data.metaLigacoes} delay={600} />
            <StatCard emoji="✅" label="APROVEITADOS" value={data.aproveitados} meta={data.metaAproveitados} delay={800} />
            <StatCard emoji="📅" label="VISITAS" value={data.visitasMarcadas} meta={data.metaVisitas} delay={1000} />
            <StatCard emoji="⭐" label="PONTOS" value={data.pontos} metaLabel="conquistados" delay={1200} />
          </div>
        )}

        {/* PHASE 3: XP Bar */}
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-semibold">XP GANHO HOJE</span>
              <span className="text-blue-400 font-bold">
                +{xpAnimated} XP → {level.emoji} {level.label}
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${levelProgress}%`,
                  background: "linear-gradient(90deg, #3B82F6, #60A5FA)",
                  animation: "xpFill 1.5s ease-out both, xpGlow 2s ease-in-out infinite",
                  animationDelay: "0s, 1.5s",
                }}
              />
            </div>
          </motion.div>
        )}

        {/* PHASE 4: Achievements */}
        {phase >= 4 && metAny && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap gap-2 justify-center"
          >
            {data.tentativas >= data.metaLigacoes && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                <Trophy className="h-3.5 w-3.5" /> Meta de ligações batida!
              </motion.div>
            )}
            {data.aproveitados >= data.metaAproveitados && data.metaAproveitados > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}
              >
                🎯 Meta de aproveitados batida!
              </motion.div>
            )}
            {data.visitasMarcadas >= data.metaVisitas && data.metaVisitas > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(249,115,22,0.15)", color: "#fdba74", border: "1px solid rgba(249,115,22,0.3)" }}
              >
                📅 Meta de visitas batida!
              </motion.div>
            )}
            {(data.streak || 0) >= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                🔥 {data.streak} dias de streak!
              </motion.div>
            )}
          </motion.div>
        )}

        {/* PHASE 5: HOMI message */}
        {phase >= 5 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              background: "#1C2128",
              border: "1px solid rgba(99,179,237,0.2)",
            }}
          >
            <img
              src={homiMascot}
              alt="HOMI"
              className="w-12 h-12 object-contain shrink-0"
              style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.4))" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">HOMI AI</p>
              <p className="text-sm text-neutral-200 whitespace-pre-line leading-relaxed">{homiMsg}</p>
            </div>
          </motion.div>
        )}

        {/* PHASE 6: Action Buttons */}
        {phase >= 6 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3 justify-center pt-2"
          >
            <button
              onClick={onNewSession}
              className="h-12 px-6 rounded-xl text-sm font-bold text-white flex items-center gap-2"
              style={{
                background: "#22C55E",
                boxShadow: "0 0 20px rgba(34,197,94,0.4)",
                animation: "xpGlow 2s ease-in-out infinite",
              }}
            >
              <RotateCcw className="h-4 w-4" /> Nova Sessão
            </button>
            <button
              onClick={onDashboard}
              className="h-12 px-6 rounded-xl text-sm font-bold text-neutral-300 flex items-center gap-2 transition-colors hover:text-white"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <Home className="h-4 w-4" /> Ir para Dashboard
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
