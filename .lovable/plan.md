

## Revisão Completa da Tab Match — Inteligência Real + Vitrine

### Problemas Identificados

1. **Busca Typesense retorna resultados genéricos**: Quando o perfil do lead não tem filtros preenchidos, a busca usa `q: "*"` com `filter_by: "valor_venda:>0"`, retornando os primeiros 48 imóveis sem relevância alguma.

2. **Scoring retorna 0% quando perfil vazio**: A função `scoreProperty` retorna `{ score: 0, justificativas: ["Configure o perfil..."] }` quando `maxPossible === 0`, e depois o filtro `item.score <= 0` esconde tudo. Resultado: tela vazia sem feedback útil.

3. **IA Perfil falha silenciosamente**: Se o lead tem empreendimento mas sem observações, a IA pode não ter contexto suficiente. O prompt não usa o mapeamento canônico de empreendimentos (EMPREENDIMENTO_MAP da edge function `uhome-ia-core`).

4. **Auto-search no mount não usa IA**: O `useEffect` na linha 930-935 faz `handleSearch(true)` que busca sem perfil preenchido, gerando resultados ruins.

5. **Botão "Criar Vitrine" existe** (linha 1400-1414) mas só aparece após resultados — se a busca falha, nunca aparece.

6. **Bairro filter no Typesense** usa `=` em vez de backticks, causando falha em bairros com caracteres especiais (ex: "Passo d'Areia").

### Solução — 3 Melhorias Principais

#### 1. Auto-fill inteligente no mount (sem IA, baseado em dados do lead)

**Arquivo:** `src/components/pipeline/RadarImoveisTab.tsx`

Quando o componente monta e não tem `savedProfile`, inferir automaticamente o perfil a partir dos dados do lead:
- Se tem `empreendimento`, mapear para bairro/tipo/faixa de preço usando um mapeamento local (extraído do EMPREENDIMENTO_MAP existente na edge function)
- Se tem `valor_estimado`, definir como `valor_max` com margem de ±20%
- Se tem `observacoes`, extrair bairros e tipos mencionados via regex simples

Isso garante que a primeira busca já tenha filtros relevantes.

#### 2. Corrigir scoring para perfis parciais + fallback inteligente

**Arquivo:** `src/components/pipeline/RadarImoveisTab.tsx`

- Quando o perfil tem apenas empreendimento (sem bairro/valor/dorms), usar o empreendimento como `q` no Typesense em vez de `*`, buscando por nome
- Ajustar `scoreProperty`: quando `maxPossible === 0` mas o lead tem empreendimento, usar o match de empreendimento como critério principal (score baseado em nome match)
- Corrigir filtro de bairro no Typesense para usar backticks: `` bairro:=`Passo d'Areia` ``
- Garantir que o fallback Supabase funcione quando Typesense não retorna

#### 3. Botão Vitrine sempre visível + fluxo direto

**Arquivo:** `src/components/pipeline/RadarImoveisTab.tsx`

- Mover o botão "Criar Vitrine" para a barra de ações (junto com "Buscar Match" e "IA+"), ficando sempre visível quando há resultados selecionados
- Adicionar contador de selecionados no botão
- O fluxo de criação de vitrine (`handleCreateVitrine`) já funciona — apenas garantir visibilidade

### Detalhes Técnicos

**Mapeamento local de empreendimentos** (novo bloco de constantes no RadarImoveisTab):
```text
const EMPREENDIMENTO_INFER: Record<string, { bairros: string[], tipos: string[], valor_min: number, valor_max: number }> = {
  "orygem": { bairros: ["Teresópolis"], tipos: ["casa"], valor_min: 800000, valor_max: 1200000 },
  "connect": { bairros: ["Passo d'Areia"], tipos: ["apartamento"], valor_min: 300000, valor_max: 600000 },
  "high garden": { bairros: ["Rio Branco", "Boa Vista"], tipos: ["apartamento"], valor_min: 1200000, valor_max: 2000000 },
  "seen": { bairros: ["Três Figueiras", "Menino Deus"], tipos: ["apartamento"], valor_min: 1200000, valor_max: 2000000 },
  // ... ~15 mais do EMPREENDIMENTO_MAP existente
};
```

**Fluxo de busca corrigido:**
1. Mount → tenta inferir perfil do lead → se inferiu algo, busca automática
2. Se perfil vazio, mostra prompt "Use IA Perfil para preencher automaticamente"
3. Busca usa `q` inteligente (nome do empreendimento se disponível, senão `*`)
4. Scoring normaliza para porcentagem real do que foi avaliado
5. Resultados mostram Top 4 com fotos + botão Vitrine fixo

**Correção de filtro Typesense** (bairros com apóstrofo):
```typescript
// Antes: bairro:=Passo d'Areia  (ERRO)
// Depois: bairro:=`Passo d'Areia`
if (profileForm.bairros.length === 1) filterParts.push(`bairro:=\`${profileForm.bairros[0]}\``);
else if (profileForm.bairros.length > 1) filterParts.push(`bairro:[\`${profileForm.bairros.join("`,`")}\`]`);
```

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/pipeline/RadarImoveisTab.tsx` | Inferência de perfil no mount, fix de filtros Typesense, scoring corrigido, botão vitrine reposicionado |

### Guardrails
- Zero alteração em hooks externos, edge functions ou banco
- Lógica de criação de vitrine inalterada (já funciona)
- Mapeamento de empreendimentos é read-only, sem chamada de API

