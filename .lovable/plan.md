

# Plano: Ajustar aba WhatsApp existente no modal do lead

A aba WhatsApp já existe em `PipelineLeadDetail.tsx` e `LeadWhatsAppTab.tsx`. Duas alterações necessárias para alinhar com a nova especificação:

## Arquivo: `src/components/pipeline/LeadWhatsAppTab.tsx`

### Alteração 1 — ESTADO A: botão "Iniciar conversa" navega ao inbox em vez de enviar mensagem
- Linha 123: trocar `onClick={handleIniciarConversa}` por `onClick={() => navigate(\`/whatsapp?lead=\${leadId}\`)}`
- Remover estado `sending`, função `handleIniciarConversa`, e imports não utilizados (`toast`, `Loader2` do botão)

### Alteração 2 — ESTADO B: balões sent com fundo `#4F46E5` e texto branco
- Linha 160-163: trocar classes do balão sent de `bg-primary/10 text-foreground` para `bg-[#4F46E5] text-white`
- Balão received permanece `bg-muted text-foreground`

## O que NÃO será alterado
- Nenhuma outra aba, hook, query ou componente
- Lógica de dados (query + instância) permanece igual
- `PipelineLeadDetail.tsx` não precisa de alteração

