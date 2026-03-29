

## Executar Sweep de Leads Descartados → Lista de Março

### O que fazer

Invocar a Edge Function `sweep-descartados` que já existe e já usa o nome dinâmico mensal (`"Leads não aproveitados - Março 2026"`). Ela vai:

1. Buscar todos os leads com `stage_id` = descarte e `arquivado = false`
2. Criar (ou encontrar) a lista "Leads não aproveitados - Março 2026" na Oferta Ativa
3. Inserir os leads na lista (ignorando duplicados por telefone)
4. Marcar os leads como `arquivado = true` no pipeline

### Como executar

Uma única chamada à edge function via `supabase--curl_edge_functions` com método POST para `sweep-descartados`. Nenhuma alteração de código necessária — a função já está pronta com a lógica mensal implementada na última mudança.

