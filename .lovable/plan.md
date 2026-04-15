

## Plano: Atualizar Prompt Master do HOMI Copilot

### Análise

O `homi-copilot/index.ts` já tem ~90% do conteúdo que você enviou (empreendimentos, etapas, gatilhos, cross-sell, contexto dinâmico do CRM). As adições reais do "Prompt Master" são:

1. **Multi-perfil** — O prompt diferencia 4 modos (Corretor, Gerente, CEO, Copilot real-time) mas a edge function atual sempre roda como "Copilot real-time" dentro do WhatsApp Inbox. Vou adicionar a seção de detecção automática de temperatura (frio/morno/quente com estratégias) e o output de 3 opções de resposta ao invés de 1.

2. **Detecção automática de temperatura** — Regras para lead frio (curiosidade + pressão), morno (valor + prova), quente (fechamento + visita).

3. **Contexto operacional Uhome** — 1000+ leads/mês, 30 visitas/semana, problema de leads travados em qualificação/busca.

4. **Pipeline de Negócios** — Adicionar as etapas pós-venda (Proposta → Contrato Assinado) que faltam.

5. **Output expandido** — Gerar 3 opções de resposta (direta, leve, curiosa) + temperatura detectada no JSON.

### Alterações

**Arquivo: `supabase/functions/homi-copilot/index.ts`**

Substituir apenas o `prompt` string (linhas 140-368) pelo Prompt Master completo, incorporando:

- Seção "CONTEXTO UHOME" com dados operacionais (1000+ leads, 30 visitas/sem, gargalo em qualificação/busca)
- Pipeline de Negócios (Novo Negócio → Contrato Assinado)  
- Detecção automática de temperatura com estratégias por tipo (frio, morno, quente)
- 3 opções de resposta no output JSON (`opcoes_resposta`: array de 3 strings variando abordagem)
- Campo `temperatura_detectada` no JSON de saída
- Manter todas as seções existentes (empreendimentos, cross-sell, etapas, gatilhos)
- Manter todas as variáveis dinâmicas existentes (`${nome}`, `${etapa}`, `${historico}`, etc.)

**Arquivo: `src/components/whatsapp/HomiCopilotCard.tsx`**

Atualizar para exibir as 3 opções de resposta:
- Mostrar 3 botões "Opção 1", "Opção 2", "Opção 3" ao invés de um único textarea
- Ao clicar numa opção, preenche o textarea para edição antes de enviar
- Mostrar temperatura detectada junto ao tom
- Adicionar `temperatura_detectada` ao interface `CopilotData`

**Deploy: `homi-copilot`**

### Estrutura do novo JSON de saída

```json
{
  "momento_detectado": "primeiro_contato|qualificacao|...",
  "temperatura_detectada": "frio|morno|quente",
  "opcoes_resposta": [
    "Opção direta...",
    "Opção leve...",
    "Opção curiosa..."
  ],
  "sugestao_resposta": "melhor opção (para compatibilidade)",
  "briefing": "máx 15 palavras",
  "tom_detectado": "interessado|hesitante|frio|...",
  "proxima_acao": "ação concreta",
  "sugestao_followup": "string|null",
  "sugestao_etapa": "string|null"
}
```

### O que NÃO muda
- Lógica de queries (linhas 34-138) permanece intacta
- Auth e parsing JSON permanecem
- Nenhuma tabela alterada
- Nenhum outro arquivo alterado

