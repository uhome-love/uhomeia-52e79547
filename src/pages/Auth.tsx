import UhomeLogo from "@/components/UhomeLogo";
import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { Mail, Lock, User, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

/* ─── Particle Canvas (stars) ─── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; r: number; vx: number; vy: number;
      baseOpacity: number; opacity: number; twinkle: boolean;
      twinkleSpeed: number; twinklePhase: number;
    }

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const particles: Particle[] = Array.from({ length: 80 }, (_, i) => {
      const isStar = i < 6;
      return {
        x: Math.random() * W(),
        y: Math.random() * H(),
        r: isStar ? 2 : 0.6 + Math.random() * 1,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        baseOpacity: isStar ? 0.7 : 0.1 + Math.random() * 0.3,
        opacity: 0.3,
        twinkle: isStar || Math.random() < 0.25,
        twinkleSpeed: 0.005 + Math.random() * 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      const w = W(), h = H();
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        if (p.twinkle) {
          p.twinklePhase += p.twinkleSpeed;
          p.opacity = p.baseOpacity * (0.3 + 0.7 * ((Math.sin(p.twinklePhase) + 1) / 2));
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }} />;
}

/* ─── CSS Animations ─── */
const styles = `
@keyframes fade-in-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
@keyframes fade-in-scale { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
.anim-fiu { animation: fade-in-up 0.6s cubic-bezier(.22,1,.36,1) both }
.anim-fis { animation: fade-in-scale 0.5s cubic-bezier(.22,1,.36,1) both }
.anim-d1 { animation-delay:.1s } .anim-d2 { animation-delay:.2s } .anim-d3 { animation-delay:.3s } .anim-d4 { animation-delay:.4s }
`;

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.includes("Invalid login")) toast.error("Email ou senha incorretos.");
          else if (error.message?.includes("Email not confirmed")) toast.error("Confirme seu email antes de entrar.");
          else toast.error(error.message || "Erro ao entrar.");
        }
      } else {
        if (!nome.trim()) { toast.error("Informe seu nome."); setSubmitting(false); return; }
        const { error } = await signUp(email, password, nome);
        if (error) toast.error(error.message || "Erro ao criar conta.");
        else toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    } finally { setSubmitting(false); }
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden" style={{ background: "#0a0a0f" }}>
      <style>{styles}</style>
      <ParticleCanvas />

      {/* ═══ LEFT — Branding (hidden on mobile) ═══ */}
      <div className="hidden lg:flex flex-col justify-between relative z-10 w-[52%] p-12 xl:p-16">
        {/* Logo top */}
        <div className="anim-fiu">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#4F46E5] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-[20px] font-bold text-white tracking-[-0.5px]">
              UhomeSales
            </span>
          </div>
        </div>

        {/* Center — headline */}
        <div className="anim-fiu anim-d1 max-w-[480px]">
          <h1 className="text-[48px] xl:text-[56px] font-extrabold leading-[1.05] tracking-[-2px] text-white">
            A plataforma dos{"\n"}
            <span className="text-[#4F46E5]">corretores</span> que{"\n"}
            vendem mais.
          </h1>
          <p className="text-[16px] text-[#52525b] mt-6 leading-relaxed max-w-[400px]">
            Gestão de leads, pipeline, performance e IA embarcada em um só lugar.
          </p>
        </div>

        {/* Bottom — stats */}
        <div className="flex items-center gap-10 anim-fiu anim-d2">
          <div>
            <p className="text-[28px] font-bold text-white">2.780+</p>
            <p className="text-[12px] text-[#3f3f46] mt-0.5">leads gerenciados</p>
          </div>
          <div className="w-px h-10 bg-white/[0.08]" />
          <div>
            <p className="text-[28px] font-bold text-[#10b981]">R$ 36M</p>
            <p className="text-[12px] text-[#3f3f46] mt-0.5">VGV no pipeline</p>
          </div>
          <div className="w-px h-10 bg-white/[0.08]" />
          <div>
            <p className="text-[28px] font-bold text-white">26</p>
            <p className="text-[12px] text-[#3f3f46] mt-0.5">corretores ativos</p>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT — Form ═══ */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-6 py-10">
        <div className="w-full max-w-[400px]">

          {/* Logo mobile only */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-10 anim-fis">
            <div className="w-8 h-8 rounded-[9px] bg-[#4F46E5] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-[18px] font-bold text-white tracking-[-0.4px]">UhomeSales</span>
          </div>

          {/* Form card */}
          <div
            className="rounded-[20px] p-7 anim-fiu anim-d1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
            }}
          >
            <h2 className="text-[22px] font-bold text-white tracking-[-0.5px]">
              {isLogin ? "Bem-vindo de volta" : "Criar conta"}
            </h2>
            <p className="text-[13px] text-[#52525b] mt-1.5 mb-6">
              {isLogin ? "Entre com suas credenciais para continuar" : "Preencha seus dados para começar"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Nome (signup only) */}
              {!isLogin && (
                <div className="anim-fiu">
                  <label className="text-[12px] font-medium text-[#52525b] mb-1.5 block">Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3f3f46]" />
                    <input
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      required={!isLogin}
                      className="w-full pl-9 pr-4 h-[44px] bg-white/[0.06] border border-white/[0.1] rounded-[10px] text-white text-[13px] placeholder:text-[#3f3f46] focus:border-[#4F46E5] focus:bg-white/[0.08] outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-[12px] font-medium text-[#52525b] mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3f3f46]" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    required
                    className="w-full pl-9 pr-4 h-[44px] bg-white/[0.06] border border-white/[0.1] rounded-[10px] text-white text-[13px] placeholder:text-[#3f3f46] focus:border-[#4F46E5] focus:bg-white/[0.08] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium text-[#52525b]">Senha</label>
                  {isLogin && (
                    <button type="button" className="text-[11px] text-[#4F46E5] hover:text-[#6366f1] transition-colors">
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3f3f46]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                    className="w-full pl-9 pr-10 h-[44px] bg-white/[0.06] border border-white/[0.1] rounded-[10px] text-white text-[13px] placeholder:text-[#3f3f46] focus:border-[#4F46E5] focus:bg-white/[0.08] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3f3f46] hover:text-[#71717a] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Botão entrar */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[44px] bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold rounded-[10px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-2"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</>
                ) : (
                  <>{isLogin ? "Entrar" : "Criar conta"} <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            {/* Toggle login/signup */}
            <p className="text-center text-[13px] mt-5">
              <span className="text-[#3f3f46]">{isLogin ? "Não tem conta?" : "Já tem conta?"} </span>
              <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-[#4F46E5] hover:text-[#6366f1] transition-colors">
                {isLogin ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-[#27272a] mt-8">
            Powered by{" "}
            <span className="text-[#4F46E5] font-medium">Homi AI</span>
            {" "}· © {new Date().getFullYear()} Uhome
          </p>
        </div>
      </div>
    </div>
  );
}
