

# Plano: Página /whatsapp — WhatsApp Inbox

## Visão geral

Página de inbox completa com 3 colunas: lista de conversas, thread de mensagens e painel do lead. Suporta query param `?lead=uuid` para abrir conversa específica. Realtime via Supabase channels.

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/pages/WhatsAppInbox.tsx` | Criar — página principal com layout 3 colunas |
| `src/components/whatsapp/ConversationList.tsx` | Criar — coluna 1: lista de conversas |
| `src/components/whatsapp/ConversationThread.tsx` | Criar — coluna 2: thread + input |
| `src/components/whatsapp/LeadPanel.tsx` | Criar — coluna 3: dados do lead |
| `src/components/whatsapp/HomiCopilotCard.tsx` | Criar — card de sugestão mockada |
| `src/App.tsx` | Editar — adicionar lazy import + rota protegida |

## Detalhes técnicos

### WhatsAppInbox.tsx (página principal)
- Layout responsivo: no mobile mostra apenas lista ou thread (toggle)
- Estado: `selectedLeadId`, lido de `?lead=` query param ao montar
- Busca inicial: leads distintos com conversas via `whatsapp_mensagens` agrupado por `lead_id`
- Realtime: subscribe em `whatsapp_mensagens` para push de novas mensagens

### ConversationList.tsx (290px)
- Header: "Conversas" + campo de busca por nome
- Filtros: Todas / Não lidas / Hoje (local filter)
- Query: busca `whatsapp_mensagens` com join em `pipeline_leads` (nome, empreendimento, stage_id)
- Agrupa por lead_id, ordena por MAX(timestamp) DESC
- Cada item: avatar colorido (iniciais), nome, empreendimento, preview última msg (50 chars), hora relativa
- Item selecionado: borda esquerda #4F46E5
- Rodapé: botão "Nova conversa" → `navigate("/pipeline")` + toast

### ConversationThread.tsx (flex:1)
- Header: avatar + nome + etapa + empreendimento + botões "Ver no Pipeline" e "Agendar Visita"
- Thread: mensagens ordenadas ASC, agrupadas por data com divider ("Hoje", "Ontem", data)
- Balões: sent (#4F46E5 branco) direita, received (branco/muted) esquerda
- Auto-scroll para última mensagem via ref
- Realtime: atualiza ao receber INSERT em `whatsapp_mensagens` para o lead ativo
- HomiCopilotCard: aparece quando última msg é direction='received', com sugestão mockada + botões "Usar" / "Ignorar"
- Input: Textarea + botão enviar → `supabase.functions.invoke("whatsapp-send")` → insere em `whatsapp_mensagens` direction='sent'

### LeadPanel.tsx (220px)
- Avatar + nome + telefone
- Badges: etapa (stage_id) + segmento
- Score HOMI: barra de progresso usando `lead_score` de `pipeline_leads`
- Dados: empreendimento, valor_estimado, bairro_regiao
- Botões: "Ver no Pipeline" → `/pipeline?lead=id`, "Criar Tarefa" (placeholder toast)

### App.tsx
- Adicionar `const WhatsAppInbox = lazyRetry(() => import("./pages/WhatsAppInbox"));`
- Rota: `<Route path="/whatsapp" element={<ProtectedPage roles={["corretor","admin"]}><WhatsAppInbox /></ProtectedPage>} />`

## Dados utilizados
- `whatsapp_mensagens`: id, body, direction, timestamp, lead_id, corretor_id, media_url
- `pipeline_leads`: id, nome, telefone, empreendimento, stage_id, lead_score, valor_estimado, bairro_regiao, segmento_id, corretor_id

## O que NÃO será alterado
- Sidebar, hooks existentes, outros componentes
- Nenhuma edge function ou tabela
- HOMI Copilot será mockado (edge function criada em próximo prompt)

