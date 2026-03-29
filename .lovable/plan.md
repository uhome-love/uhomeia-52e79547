

## Relatório E2E Completo + Plano de Correções

### Problemas Encontrados (Teste End-to-End)

**PROBLEMA 1: Botões do StageCoachBar abrem HOMI sem passar o prompt**
- `onOpenHomi={() => setHomiOpen(true)}` na linha 516 de `PipelineLeadDetail.tsx` IGNORA o prompt passado por `triggerHomi(prompt)`
- Resultado: botões como "Script de ligação", "WhatsApp apresentação", "Perguntas de qualificação" abrem o HOMI vazio, sem contexto
- O corretor clica no botão esperando algo pronto e recebe tela genérica

**PROBLEMA 2: "Script de ligação" em sem_contato cria tarefa E abre HOMI ao mesmo tempo**
- Linha 81: tem `onClick: () => createQuickTask(...)` E `homiPrompt` no mesmo botão
- O `onClick` tem prioridade (linha 325: `action.onClick || (action.homiPrompt ? ...)`), então cria tarefa em vez de gerar script
- Corretor espera script, recebe toast de tarefa criada

**PROBLEMA 3: Respostas gigantescas da IA — formato obrigatório de 6 seções para TUDO**
- Linhas 642-679 do `homi-assistant/index.ts`: TODA resposta DEVE ter Análise + WhatsApp + Alternativa + Script Ligação + Alerta + Próxima Ação
- Quando corretor quer só uma msg de WhatsApp, recebe 6 seções com script de ligação, alerta, etc.
- Não existe diferenciação por tipo de ação

**PROBLEMA 4: Mensagem "Lead Portal (ImovelWeb)" aparece para lead Meta Ads**
- Linha 90-92: mensagem hardcoded "Lead Portal (ImovelWeb)" aparece para TODOS os leads em sem_contato
- Lead da Patty Natel é `meta_ads` mas vê sugestão de portal

**PROBLEMA 5: Resultado da IA é um bloco markdown único sem botões por seção**
- Linhas 492-520 do `HomiLeadAssistant.tsx`: resultado é `<ReactMarkdown>{result}</ReactMarkdown>` em bloco único
- Só tem botão "Copiar" que copia TUDO — corretor quer copiar SÓ a mensagem WhatsApp
- Não tem como copiar seções individuais

**PROBLEMA 6: "Copiar + WhatsApp" não envia a mensagem — abre wa.me sem texto**
- Linha 510: `window.open(\`https://wa.me/${fullPhone}\`, "_blank")` — sem `?text=`
- Copia para clipboard mas não passa no link do WhatsApp

---

### Plano de Correções (5 mudanças)

#### 1. Passar prompt do StageCoachBar para o HOMI (`PipelineLeadDetail.tsx`)
- Mudar `onOpenHomi={() => setHomiOpen(true)}` para `onOpenHomi={(prompt) => { setHomiOpen(true); setHomiInitialPrompt(prompt); }}`
- Criar state `homiInitialPrompt` e passar como prop para `HomiLeadAssistant`
- Quando HOMI recebe prompt inicial, auto-executar a ação correspondente

#### 2. Corrigir botão "Script de ligação" — remover createQuickTask (`StageCoachBar.tsx`)
- Linha 81: remover `onClick: () => createQuickTask(...)` do botão "Script de ligação" em sem_contato
- Manter apenas `homiPrompt` para que gere o script via IA
- Botões que criam tarefas: "Agendar follow-up", "Confirmar visita", "Agendar visita" (ações operacionais reais)

#### 3. Formato condicional por tipo de ação (`homi-assistant/index.ts`)
- Quando `acao` for WhatsApp (`primeiro_contato`, `whatsapp_intro`, `whatsapp_reengajamento`, `responder_cliente`, `responder_whatsapp`): formato curto — só 2 mensagens (3 linhas cada) + qual usar e por quê
- Quando `acao` for ligação (`script_ligacao`): formato médio — só script Corretor/Cliente + dicas
- Quando `acao` for objeção (`quebrar_objecao`): formato médio — resposta + alternativa
- Quando `acao` for consultivo (`custom`, `preparar_visita`, etc.): formato completo atual
- Implementar injetando o formato correto antes do prompt do usuário

#### 4. Filtrar mensagens por origem do lead (`StageCoachBar.tsx`)
- Adicionar prop `origem` ao componente
- No caso `sem_contato`: filtrar "Lead Portal (ImovelWeb)" — só mostrar quando `origem` contém "portal" ou "imovelweb"
- Para `meta_ads`: mostrar "Versão direta", "Apresentação consultiva", "Reativação criativa"

#### 5. Resultado com seções copiáveis individualmente (`HomiLeadAssistant.tsx`)
- Parsear resultado por `## ` headers em seções separadas
- Cada seção renderiza como card com botão "Copiar" individual
- Seções de WhatsApp (💬 e 🔄) ganham botão "Copiar + WhatsApp" com `wa.me/?text=`
- Corrigir link WhatsApp atual para incluir `?text=${encodeURIComponent(result)}`

---

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/pipeline/PipelineLeadDetail.tsx` | State `homiInitialPrompt`, passar para HOMI, prop `origem` no StageCoachBar |
| `src/components/pipeline/StageCoachBar.tsx` | Adicionar prop `origem`, filtrar mensagens, corrigir botão script |
| `src/components/pipeline/HomiLeadAssistant.tsx` | Receber `initialPrompt`, auto-executar, parsear resultado em cards copiáveis, fix WhatsApp link |
| `supabase/functions/homi-assistant/index.ts` | Formato condicional por tipo de ação |

### O que NAO muda
- Playbooks e knowledge do system prompt
- Briefing e recommendation logic
- Lógica de histórico e contexto
- Nenhuma outra edge function ou componente

