

## Leads Descartados → Lista Mensal Automática

### Problema
Hoje, todos os leads descartados vão para uma única lista fixa chamada "Leads Descartados". O usuário quer que sejam encaminhados para uma lista mensal (ex: "Leads não aproveitados - Março 2026").

### Solução

Alterar a lógica de descarte em **2 arquivos** para usar nome de lista dinâmico baseado no mês/ano atual:

**1. `src/components/pipeline/PipelineBoard.tsx`** (linhas 498-525)
- Trocar `const LISTA_NOME = "Leads Descartados"` por nome dinâmico:
  ```text
  "Leads não aproveitados - Março 2026"
  ```
- Usar `new Date()` para gerar o nome com mês em português e ano
- O resto da lógica (find or create list) já funciona — se a lista do mês não existe, cria automaticamente

**2. `supabase/functions/sweep-descartados/index.ts`** (linhas 34-60)
- Mesma mudança: trocar nome fixo por nome dinâmico mensal
- A lógica de find-or-create já existente cuida do resto

### Lógica do nome dinâmico
```text
const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const now = new Date();
const LISTA_NOME = `Leads não aproveitados - ${meses[now.getMonth()]} ${now.getFullYear()}`;
```

### Resultado
- Cada mês gera automaticamente uma lista nova na Oferta Ativa
- Listas anteriores permanecem intactas para consulta
- Zero migration SQL necessária

