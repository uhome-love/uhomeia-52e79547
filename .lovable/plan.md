

## Integrar Playbooks Elite por Empreendimento + Origem do Lead

### O que muda

Substituir os 4 playbooks genéricos atuais (linhas 80-98 do `homi-assistant/index.ts`) pelos playbooks completos com: posicionamento real, perfil, psicologia, abordagem, scripts de abertura/exploração/condução, erro crítico e frase de fechamento.

### Mudanças

#### 1. `supabase/functions/homi-assistant/index.ts` — System prompt

**Substituir seção "PLAYBOOKS POR EMPREENDIMENTO (FALLBACK)" (linhas 75-98)** pelo conteúdo completo:

**Playbooks por produto:**
- **Las Casas**: Upgrade de vida, emoção > razão, nunca começar com preço, "Esse aqui é bem diferente do padrão de apartamento..."
- **Connect João Wallig**: Investimento/liquidez, Cyrela, "Esse aqui não é tanto sobre morar, é mais uma decisão inteligente..."
- **Shift**: Porta de entrada investimento, jovem, primeiro investimento, "Esse aqui é muito usado por quem quer começar a investir..."
- **Orygem**: Produto mais qualificado, cliente exigente, "Esse aqui já é um nível acima do padrão comum..."
- **Open Bosque** e **Melnick Day**: Mantêm o conteúdo atual

**Nova seção "PLAYBOOKS POR ORIGEM DO LEAD":**
- **Lead ImovelWeb (Portal)**: Lead frio, comparando vários, abrir leque, "Tenho opções melhores dependendo do que tu busca"
- **Lead Imóvel Usado (Avulso)**: Cliente racional, virar consultor, vender orientação
- **Lead Site Uhome**: Mais quente, curadoria, assumir controle

**Nova seção "SCRIPTS DE LIGAÇÃO POR CENÁRIO" (substituir os genéricos linhas 146-153):**
- Lead frio portal, qualificação, investidor, moradia, visita, pós-visita — todos com scripts específicos do documento

**Nova seção "REGRAS AVANÇADAS (NÍVEL ELITE)":**
- Nunca vender imóvel → vender decisão
- Quem pergunta controla a conversa
- Visita é o fechamento parcial
- Lead confuso precisa de direção
- Lead frio precisa de curiosidade

**Adicionar "FRASES DE ALTA PERFORMANCE"** como referência para a IA variar nas respostas.

**Atualizar seção PERSONALIDADE** com objetivo final elite: conduz (não reage), orienta (não vende), direciona (não insiste), desperta interesse (não empurra).

#### 2. `src/components/pipeline/StageCoachBar.tsx` — Scripts nos cards

Atualizar as mensagens prontas para incluir variações baseadas no playbook elite. Por exemplo, na etapa "sem_contato", adicionar uma versão "Portal" para leads ImovelWeb:
- "Fala {{nome}}! Vi teu interesse nesse imóvel — ele ainda tá disponível sim 👀"

Na etapa de qualificação, incluir variação investidor vs moradia:
- Investidor: "Tu tá pensando mais em renda ou valorização?"
- Moradia: "O que mais pesa pra ti hoje: espaço, localização ou valor?"

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/homi-assistant/index.ts` | Playbooks elite completos (Las Casas, Connect JW, Shift, Orygem) + playbooks por origem + scripts por cenário + regras elite + frases de alta performance |
| `src/components/pipeline/StageCoachBar.tsx` | Mensagens adicionais por origem (portal, avulso, site) e por perfil (investidor, moradia) |

