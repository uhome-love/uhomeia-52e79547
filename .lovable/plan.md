

## Integrar Base de Conhecimento Elite no Sistema HOMI

### O que já existe vs o que falta

| Conceito da Base | Já existe? | Onde? |
|---|---|---|
| Prompts por etapa (sem contato, qualificação, visita, pós-visita) | ✅ Parcial | `homi-assistant` system prompt |
| Scripts de ligação por etapa | ✅ Genérico | Falta os scripts ESPECÍFICOS da base |
| Playbooks por empreendimento (Open Bosque, Orygem, Casa Tua, Melnick Day) | ❌ | Apenas DB enterprise-knowledge (campos livres) |
| Lead Scoring comportamental (respondeu +10, engajou +20, etc.) | ❌ | Existe score de perfil, não comportamental |
| Detecção de erros do corretor | ❌ | Não existe |
| Follow-up avançado (curiosidade, prova social, humor, oportunidade) | ✅ Parcial | Falta tipificação |
| Gatilhos mentais (escassez, urgência, prova social) | ✅ | Já no system prompt |
| Output padrão (análise + 3 msgs + follow-ups + alerta erro) | ✅ Parcial | Formato existe, falta alerta de erro |
| Fluxo automação CEO (5min, 10min, 1d, 3d, 7d) | ✅ | Implementado no `cron-nurturing-sequencer` |

### Mudanças

#### 1. Enriquecer `homi-assistant/index.ts` system prompt

Adicionar ao prompt do corretor:

- **Playbooks por empreendimento**: Seção com perfil + abordagem + mensagem modelo para Open Bosque, Orygem, Casa Tua, Melnick Day (e os existentes do DB continuam prioritários)
- **Detecção de erros**: Instruir a IA a identificar e alertar quando detectar pressão precoce, falta de resposta do corretor, ou mensagem robótica. Adicionar seção `## ⚠️ Alerta` ao formato de saída
- **Tipos de follow-up**: Adicionar ao prompt as 4 categorias (curiosidade, prova social, oportunidade, humor leve) para que a IA varie estrategicamente
- **Scoring comportamental como referência**: Incluir a tabela de pontos (respondeu +10, engajou +20, etc.) para que a IA use na análise da situação — não substitui o `leadScoring.ts` do frontend, complementa

#### 2. Atualizar `StageCoachBar.tsx` com scripts da base

Substituir mensagens genéricas pelos scripts ESPECÍFICOS do documento:

- **Sem Contato**: "Fala {{nome}}, tudo bem? Vi que tu pediu info do {{empreendimento}} e resolvi te ligar rápido..."
- **Contato Iniciado**: "Queria entender melhor teu momento pra te mostrar algo que realmente faça sentido."
- **Qualificação**: "Hoje tu tá mais olhando ou já pensando em fechar algo?"
- **Visita**: "Faz muito mais sentido ver isso pessoalmente — tenho dois horários livres, qual encaixa melhor pra ti?"
- **Pós Visita**: "O que pesou mais pra ti na visita?"

Manter as mensagens WhatsApp atuais como "Versão formal" e adicionar as da base como "Versão direta".

#### 3. Adicionar formato de output completo ao `homi-assistant`

Incluir no formato obrigatório:
```
## ⚠️ Alerta de Abordagem (se aplicável)
(Se detectar erro do corretor: pressão precoce, mensagem robótica, 
falta de follow-up — alertar aqui com correção sugerida)
```

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/homi-assistant/index.ts` | Playbooks por empreendimento, detecção de erros, tipos de follow-up, scoring comportamental como referência |
| `src/components/pipeline/StageCoachBar.tsx` | Scripts específicos da base elite + versões alternativas |

### O que NÃO muda
- `leadScoring.ts` (score de perfil continua como está — o comportamental é referência para a IA)
- Edge functions de automação (já implementadas)
- Enterprise knowledge do DB (continua prioritário sobre fallback)

