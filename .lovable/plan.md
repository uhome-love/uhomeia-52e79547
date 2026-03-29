

## Fix Marketplace — Categorias Não Batem

### Diagnóstico

O Marketplace usa a tabela `marketplace_items` (não `comunicacao_templates`). Já existem **24 itens aprovados** no banco. Porém o filtro não funciona porque:

- **No banco**: `categoria = "Scripts de Ligação"`, `"Mensagens WhatsApp"`, `"Quebra de Objeções"`, etc.
- **No código**: o filtro envia `.eq("categoria", "script_ligacao")`, `"whatsapp"`, etc.
- **Resultado**: nenhum filtro bate → categorias aparecem vazias

### Solução — 2 passos

**Passo 1 — Corrigir dados no banco** (UPDATE via insert tool)

Padronizar as categorias no banco para os enum values que o código espera:

```sql
UPDATE marketplace_items SET categoria = 'script_ligacao' WHERE categoria = 'Scripts de Ligação';
UPDATE marketplace_items SET categoria = 'whatsapp' WHERE categoria = 'Mensagens WhatsApp';
UPDATE marketplace_items SET categoria = 'argumento_empreendimento' WHERE categoria = 'Argumentos por Empreendimento';
UPDATE marketplace_items SET categoria = 'quebra_objecao' WHERE categoria = 'Quebra de Objeções';
UPDATE marketplace_items SET categoria = 'template_proposta' WHERE categoria = 'Templates de Proposta';
```

**Passo 2 — Inserir os 25 templates na tabela correta** (`marketplace_items`)

Os 25 scripts que estão em `comunicacao_templates` precisam ser copiados para `marketplace_items` com as categorias corretas:

- Ligação → `script_ligacao`
- WhatsApp → `whatsapp`
- Argumentos → `argumento_empreendimento`
- Objeções → `quebra_objecao`

Campos: `titulo`, `conteudo`, `categoria`, `tags`, `status = 'aprovado'`, `origem = 'sistema'`.

### Resultado esperado

- Filtro "Ligação" mostra ~10 scripts
- Filtro "WhatsApp" mostra ~10 scripts
- Filtro "Argumentos" mostra ~5 scripts
- Filtro "Objeções" mostra ~5 scripts
- "Todos" mostra todos os ~49 itens

### Arquivos alterados
Nenhum arquivo de código — apenas dados no banco.

### O que NÃO muda
- `useMarketplace.ts` — lógica de filtro já está correta
- `CentralComunicacao.tsx` — UI já está correta
- Nenhum componente ou hook

