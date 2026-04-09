
# Plano: Corrigir interesse de imóvel para leads do site

## Problema
Quando um lead vem do site com um imóvel específico (ex: código `340340-UP`), o trigger `sync_site_lead_to_pipeline` cria o registro em `pipeline_leads` mas **não preenche** as colunas `imovel_codigo` e `imovel_url`. Os dados ficam apenas dentro do JSON `dados_site`, invisíveis para o corretor.

O campo `empreendimento` recebe o texto genérico `"Apartamento 3 quartos — Rio Branco"` em vez do título real do imóvel ou um link clicável.

## Solução

### 1. Migração SQL — Atualizar trigger `sync_site_lead_to_pipeline`
Alterar o trigger para:
- **Setar `imovel_codigo`** com `NEW.imovel_codigo` na inserção e no update
- **Gerar `imovel_url`** a partir do slug: concatenar `https://uhomesales.com/imovel/` + `NEW.imovel_slug` quando disponível
- **Melhorar `empreendimento`**: se houver `imovel_codigo`, buscar o título real na tabela `properties` via subselect; caso contrário, manter `NEW.imovel_interesse`

### 2. Migração SQL — Corrigir leads existentes
Script para preencher `imovel_codigo` e `imovel_url` dos leads que já estão no pipeline com `dados_site` contendo esses dados:
```sql
UPDATE pipeline_leads SET
  imovel_codigo = dados_site->>'imovel_codigo',
  imovel_url = 'https://uhomesales.com/imovel/' || (dados_site->>'imovel_slug')
WHERE origem = 'site_uhome'
  AND imovel_codigo IS NULL
  AND dados_site->>'imovel_codigo' IS NOT NULL
  AND dados_site->>'imovel_slug' IS NOT NULL;
```

### 3. UI — Mostrar link do imóvel no detalhe do lead
- **`src/components/pipeline/PipelineLeadDetail.tsx`**: Na seção do empreendimento (row 2.5), quando `imovel_url` existir, exibir como link clicável (abre em nova aba). Quando houver `imovel_codigo`, mostrar o código como badge ao lado.
- **`src/components/pipeline/PipelineCard.tsx`**: No card do kanban, se `imovel_codigo` existir, exibir como badge pequeno junto ao empreendimento.

### 4. Buscar dados do lead
- **`src/hooks/usePipeline.ts`** ou query equivalente: garantir que `imovel_codigo` e `imovel_url` são incluídos no select dos pipeline_leads.

## Arquivos afetados
- Migração SQL (trigger + backfill de dados)
- `src/components/pipeline/PipelineLeadDetail.tsx` — link clicável do imóvel
- `src/components/pipeline/PipelineCard.tsx` — badge de código
- Query de pipeline_leads (se não incluir esses campos)
