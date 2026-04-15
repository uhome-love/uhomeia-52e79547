

## Plano: Mídia no WhatsApp Inbox (Receber + Enviar)

### Parte 1 — Exibir mídia recebida na thread

**Arquivo: `src/components/whatsapp/ConversationThread.tsx`**

No render de cada mensagem (linha ~510), substituir `{msg.body || (msg.media_url ? "📎 Mídia" : "...")}` por um componente `MediaRenderer` que detecta o tipo pela URL/extensão:

```
- Imagem (.jpg, .png, .webp, .jpeg) → <img> com onClick para abrir Dialog de ampliação (lightbox)
- Áudio (.ogg, .mp3, .m4a, .wav) → <audio controls> nativo
- Vídeo (.mp4, .3gp) → <video controls> com max-width
- Documento (.pdf, .doc, .xlsx) → Ícone 📄 + link download
- Fallback → link genérico para download
```

Se `msg.body` também existir, exibir mídia + texto abaixo.

Adicionar um `Dialog` (lightbox) para ampliar imagens ao clicar.

### Parte 2 — Enviar mídia (botão 📎)

**Arquivo: `src/components/whatsapp/ConversationThread.tsx`**

Adicionar botão `Paperclip` (📎) ao lado do input de texto:
- Abre `<input type="file">` oculto (accept: image/*, audio/*, video/*, .pdf, .doc, .xlsx)
- Ao selecionar arquivo:
  1. Converte para base64
  2. Chama edge function `whatsapp-send-media`

**Nova Edge Function: `supabase/functions/whatsapp-send-media/index.ts`**

Recebe: `{ telefone, media_base64, media_type, filename, caption? }`

Lógica:
1. Auth via `getUser()`
2. Buscar instância Evolution do corretor: query `whatsapp_instances` por profile_id
3. Se tem instância Evolution ativa → POST `/message/sendMedia/{instanceName}` na Evolution API
4. Se não tem instância → POST na Meta API (`/messages` com type image/document/audio/video)
5. Retorna `{ success, message_id }`

Após sucesso no frontend, inserir em `whatsapp_mensagens` com `media_url` preenchido (para Evolution, a URL vem do response; para Meta, gerar referência).

**Deploy:** `whatsapp-send-media`

### Parte 3 — Componente auxiliar

Criar `src/components/whatsapp/MediaRenderer.tsx`:
- Props: `{ mediaUrl: string; body?: string | null; direction: string }`
- Detecta tipo por extensão ou MIME
- Renderiza o elemento adequado
- Imagens clicáveis abrem lightbox

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/whatsapp/MediaRenderer.tsx` | **Criar** — render de mídia por tipo |
| `src/components/whatsapp/ConversationThread.tsx` | **Editar** — usar MediaRenderer + botão 📎 + input file + handler de envio |
| `supabase/functions/whatsapp-send-media/index.ts` | **Criar** — envio de mídia via Evolution ou Meta API |

### O que NÃO muda
- Tabelas (media_url já existe em whatsapp_mensagens)
- Webhook Evolution (já captura media_url)
- Edge function whatsapp-send existente (texto continua igual)

