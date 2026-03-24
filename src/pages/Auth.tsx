import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, ArrowRight, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

/* ─── CSS Stars ─── */
function Stars() {
  const [stars] = useState(() =>
    Array.from({ length: 80 }, (_, i) => {
      const size = Math.random() < 0.7 ? 1.5 : Math.random() < 0.5 ? 2 : 2.5;
      return { id: i, size, top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, dur: `${3+Math.random()*5}s`, delay: `${Math.random()*6}s`, maxOp: 0.3+Math.random()*0.5 };
    })
  );
  return (
    <div className="fixed inset-0 z-0">
      {stars.map(s => (
        <div key={s.id} className="absolute rounded-full bg-white" style={{ width: s.size, height: s.size, top: s.top, left: s.left, animation: `twinkle ${s.dur} ease-in-out infinite ${s.delay}`, opacity: 0, ["--max-op" as string]: s.maxOp }} />
      ))}
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@keyframes twinkle { 0%,100%{opacity:0;transform:scale(0.8)} 50%{opacity:var(--max-op,0.7);transform:scale(1)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
.anim-up { animation: fadeUp 0.6s ease forwards }
.anim-up-d1 { animation: fadeUp 0.6s 0.1s ease forwards; opacity:0 }
`;

const inputClass = "w-full h-[44px] pl-[38px] pr-3 bg-white/[0.06] border border-white/10 rounded-[10px] text-[14px] text-[#f0f0f8] placeholder:text-[rgba(240,240,248,0.35)] outline-none transition-all focus:border-[#4F46E5] focus:bg-[rgba(79,70,229,0.07)] focus:shadow-[0_0_0_3px_rgba(79,70,229,0.15)]";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#12141f" }}>
      <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
    </div>
  );
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
    <div className="relative min-h-screen overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{styles}</style>

      {/* Backgrounds */}
      <div className="fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(79,70,229,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(16,185,129,0.07) 0%, transparent 55%), radial-gradient(ellipse 40% 40% at 60% 10%, rgba(129,140,248,0.10) 0%, transparent 50%), linear-gradient(160deg, #15172a 0%, #0e1020 40%, #111420 100%)" }} />
      <div className="fixed inset-0 z-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <Stars />

      {/* Fixed logo top-left */}
      <div className="fixed top-7 left-6 lg:left-12 z-10 flex items-center gap-2.5 anim-up">
        <div className="w-9 h-9 rounded-[9px] bg-[#4F46E5] flex items-center justify-center" style={{ boxShadow: "0 4px 16px rgba(79,70,229,0.40)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-[15px] font-bold text-[#f0f0f8] leading-none tracking-[-0.3px]">UhomeSales</span>
          <span className="text-[10px] font-medium text-[rgba(240,240,248,0.35)] leading-none flex items-center gap-1">
            Powered by
            <span className="inline-block w-[5px] h-[5px] rounded-full bg-[#f59e0b]" style={{ boxShadow: "0 0 6px rgba(245,158,11,0.7)", animation: "pulse-dot 2s ease-in-out infinite" }} />
            Homi AI
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div className="relative z-[1] grid grid-cols-1 lg:grid-cols-2 h-screen max-w-[1280px] mx-auto px-6 lg:px-12 items-center gap-8 lg:gap-16">

        {/* Left: branding */}
        <div className="hidden lg:block anim-up">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-[5px] text-[11px] font-semibold uppercase tracking-[0.04em] mb-6" style={{ background: "rgba(79,70,229,0.15)", border: "1px solid rgba(79,70,229,0.30)", color: "#818cf8" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8]" />
            CRM Imobiliário
          </div>

          <h1 className="font-extrabold leading-[1.12] tracking-[-1.5px] text-[#f0f0f8] mb-4" style={{ fontSize: "clamp(32px, 3.5vw, 44px)" }}>
            A plataforma dos<br /><span className="text-[#818cf8]">corretores</span> que<br />vendem mais.
          </h1>

          <p className="text-[15px] text-[rgba(240,240,248,0.55)] leading-relaxed max-w-[380px] mb-10">
            Gestão de leads, pipeline, performance e IA embarcada em um só lugar.
          </p>

          <div className="flex items-stretch">
            <div className="pr-7">
              <p className="text-[26px] font-extrabold tracking-[-1px] leading-none text-[#f0f0f8] mb-1">2.780+</p>
              <p className="text-[11px] font-medium text-[rgba(240,240,248,0.35)] uppercase tracking-[0.05em]">leads gerenciados</p>
            </div>
            <div className="border-l border-white/10 px-7">
              <p className="text-[26px] font-extrabold tracking-[-1px] leading-none text-[#10b981] mb-1">R$ 36M</p>
              <p className="text-[11px] font-medium text-[rgba(240,240,248,0.35)] uppercase tracking-[0.05em]">VGV no pipeline</p>
            </div>
            <div className="border-l border-white/10 pl-7">
              <p className="text-[26px] font-extrabold tracking-[-1px] leading-none text-[#f0f0f8] mb-1">26</p>
              <p className="text-[11px] font-medium text-[rgba(240,240,248,0.35)] uppercase tracking-[0.05em]">corretores ativos</p>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="flex justify-center items-center">
          <div className="w-full max-w-[420px]">
            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center gap-4 pt-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[9px] bg-[#4F46E5] flex items-center justify-center" style={{ boxShadow: "0 4px 16px rgba(79,70,229,0.40)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
                    <path d="M9 21V12h6v9" />
                  </svg>
                </div>
                <div className="flex flex-col gap-px">
                  <span className="text-[15px] font-bold text-[#f0f0f8] leading-none tracking-[-0.3px]">UhomeSales</span>
                  <span className="text-[10px] font-medium text-[rgba(240,240,248,0.35)] leading-none flex items-center gap-1">
                    Powered by
                    <span className="inline-block w-[5px] h-[5px] rounded-full bg-[#f59e0b]" style={{ boxShadow: "0 0 6px rgba(245,158,11,0.7)", animation: "pulse-dot 2s ease-in-out infinite" }} />
                    Homi AI
                  </span>
                </div>
              </div>
            </div>

            {/* Card */}
            <div className="rounded-[20px] p-9 anim-up-d1" style={{ background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(24px)", boxShadow: "0 0 0 0.5px rgba(255,255,255,0.05) inset, 0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.20)" }}>
              <h2 className="text-[22px] font-extrabold tracking-[-0.5px] text-[#f0f0f8] mb-1.5">
                {isLogin ? "Bem-vindo de volta" : "Criar conta"}
              </h2>
              <p className="text-[13px] text-[rgba(240,240,248,0.55)] mb-7">
                {isLogin ? "Entre com suas credenciais para continuar" : "Preencha seus dados para começar"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="text-[12px] font-semibold text-[rgba(240,240,248,0.55)] mb-[7px] block tracking-[0.01em]">Nome</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[rgba(240,240,248,0.35)]" />
                      <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" required={!isLogin} className={inputClass} style={{ fontFamily: "inherit" }} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[12px] font-semibold text-[rgba(240,240,248,0.55)] mb-[7px] block tracking-[0.01em]">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[rgba(240,240,248,0.35)]" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" required autoComplete="email" className={inputClass} style={{ fontFamily: "inherit" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-[7px]">
                    <label className="text-[12px] font-semibold text-[rgba(240,240,248,0.55)] tracking-[0.01em]">Senha</label>
                    {isLogin && <button type="button" className="text-[12px] font-medium text-[#818cf8] hover:underline">Esqueceu?</button>}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[rgba(240,240,248,0.35)]" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required autoComplete={isLogin ? "current-password" : "new-password"} className={inputClass + " !pr-10"} style={{ fontFamily: "inherit" }} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(240,240,248,0.35)] hover:text-[rgba(240,240,248,0.55)] transition-colors">
                      {showPassword ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="w-full h-[46px] bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[14px] font-bold rounded-[10px] flex items-center justify-center gap-2 transition-all disabled:opacity-60 !mt-5 hover:-translate-y-px" style={{ boxShadow: "0 4px 20px rgba(79,70,229,0.40)", fontFamily: "inherit" }}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : <>{isLogin ? "Entrar" : "Criar conta"} <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              <div className="h-px bg-white/[0.07] my-5" />
              <p className="text-center text-[13px] text-[rgba(240,240,248,0.35)]">
                {isLogin ? "Não tem conta? " : "Já tem conta? "}
                <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-[#818cf8] hover:underline">{isLogin ? "Criar conta" : "Entrar"}</button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-6 right-6 lg:right-12 z-10 text-[11.5px] text-[rgba(240,240,248,0.35)]">
        Powered by <span className="text-[#818cf8] font-semibold">Homi AI</span> · © {new Date().getFullYear()} Uhome
      </div>
    </div>
  );
}
