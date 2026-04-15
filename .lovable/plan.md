

# Qualificação do WhatsApp Inbox — Roadmap para Paridade com WhatsApp Web

## O que já existe hoje
- Lista de conversas com busca, SLA badges, unread count
- Thread com mensagens, divisão por data, emoji picker, media upload
- Barra de ações rápidas (templates, visita, tarefa, etapa, nota interna)
- Painel lateral do lead (HOMI Score, edição inline)
- HOMI Copilot com sugestões de resposta
- Realtime (novas mensagens aparecem automaticamente)
- Notificações de navegador + som
- Modo leitura para gestores

## Melhorias propostas (priorizadas por impacto)

### 1. Gravação e envio de áudio (Push-to-Talk)
Funcionalidade mais usada no WhatsApp que está ausente. Botão de microfone ao lado do Send que grava áudio e envia como .ogg via Evolution API. Segura para gravar, solta para enviar (como WhatsApp Web).

### 2. Status de entrega das mensagens (✓ ✓✓)
Mostrar ticks de status (enviado ✓, entregue ✓✓, lido ✓✓ azul) abaixo de cada mensagem enviada. Requer capturar os eventos `MESSAGES_UPDATE` no webhook do Evolution e salvar o status na tabela `whatsapp_mensagens`.

### 3. Responder mensagem específica (Reply/Quote)
Ao clicar em uma mensagem, opção "Responder" que mostra a mensagem original como quote acima do texto (exatamente como no WhatsApp Web). Envia via Evolution API com `quotedMessageId`.

### 4. Indicador "Digitando..." (Typing indicator)
Mostrar quando o lead está digitando. Requer assinar o evento `TYPING` da Evolution API via webhook e exibir no header da conversa.

### 5. Pré-visualização de links (Link Preview)
Detectar URLs nas mensagens e mostrar preview com título, descrição e imagem (Open Graph), igual ao WhatsApp Web.

### 6. Busca dentro da conversa (Ctrl+F)
Campo de busca no header da thread que filtra e destaca mensagens. Navegação entre resultados com setas ↑↓.

### 7. Foto de perfil do contato
Buscar a foto do WhatsApp via Evolution API (`/chat/fetchProfilePictureUrl`) e exibir no avatar ao lado do nome.

### 8. Reações em mensagens
Permitir reagir com emoji em mensagens específicas (como WhatsApp Web). Envia via Evolution API `sendReaction`.

### 9. Encaminhar mensagem
Opção de encaminhar uma mensagem para outro lead da base.

### 10. Download de mídia recebida
Botão de download visível em imagens, vídeos e documentos recebidos.

### 11. Drag & Drop de arquivos
Arrastar arquivos diretamente na área da conversa para enviar como mídia.

### 12. Scroll infinito + "Pular para mais recente"
Carregar mensagens mais antigas conforme o usuário sobe o scroll. Botão flutuante "↓" quando não está no final da conversa.

### 13. Indicador online/offline do contato
Mostrar status de presença do contato quando disponível.

### 14. Formatação de texto (negrito, itálico)
Suportar `*negrito*`, `_itálico_`, `~tachado~` e `\`\`\`código\`\`\`` na renderização das mensagens, e atalhos de formatação no input.

### 15. Contador de caracteres e preview de template
Mostrar preview visual do template antes de enviar, com contador de caracteres.

---

## Plano de implementação (Fase 1 — maior impacto)

Recomendo começar pelas **5 funcionalidades** com maior impacto na experiência do corretor:

1. **Gravação de áudio** — Mais solicitada, essencial para corretores
2. **Status de entrega (✓✓)** — Feedback visual crítico
3. **Reply/Quote** — Contexto nas conversas
4. **Busca na conversa** — Produtividade
5. **Drag & Drop de arquivos** — Conveniência

### Detalhes técnicos resumidos

**Áudio**: Web Audio API / MediaRecorder → base64 → `whatsapp-send-media` com `audio/ogg`. Botão microfone substitui o Send quando input vazio.

**Status ✓✓**: Nova coluna `delivery_status` em `whatsapp_mensagens` (enum: sent/delivered/read). Webhook captura `MESSAGES_UPDATE`. UI renderiza ticks coloridos.

**Reply**: Nova coluna `quoted_message_id` em `whatsapp_mensagens`. Evolution API aceita `quoted.key.id`. UI mostra bloco de citação acima da mensagem.

**Busca**: Estado local no ConversationThread, filtro client-side com highlight via regex. Para conversas longas, query no banco.

**Drag & Drop**: `onDragOver`/`onDrop` na área da thread, reutiliza `handleMediaSelect`.

### Arquivos impactados
- `src/components/whatsapp/ConversationThread.tsx` (áudio, reply, busca, drag&drop)
- `supabase/functions/evolution-webhook/index.ts` (status delivery, typing)
- `supabase/functions/whatsapp-send-media/index.ts` (áudio format)
- Migration SQL (colunas `delivery_status`, `quoted_message_id`)

