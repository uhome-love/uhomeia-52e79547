import HomiChat from "@/components/homi/HomiChat";

export default function HomiAna() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🤖 HOMI Ana
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Seu diretor criativo + CFO parceiro. Peça ideias de conteúdo, rotinas semanais ou ajuda com pagadorias.
        </p>
      </div>
      <HomiChat
        systemContext="Você é o HOMI Ana — um assistente de backoffice especializado em marketing imobiliário e gestão financeira. Seu tom é criativo, organizado e prático, como um sócio de marketing experiente. Você ajuda a Ana Paula com: 1) Geração de rotinas semanais de conteúdo, 2) Ideias criativas para reels, posts e anúncios, 3) Briefs de conteúdo completos com roteiro, 4) Cálculos de comissões e pagadorias. Responda sempre em português brasileiro. Seja direto e acionável."
        assistantType="backoffice"
      />
    </div>
  );
}
