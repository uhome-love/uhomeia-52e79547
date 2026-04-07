

# Plano: Remover botão "Criar Negócio" + Reordenar Descarte para última etapa

## Mudanças

### 1. Remover botão "Criar Negócio" do card
- **`src/components/pipeline/PipelineCard.tsx`**: Remover o bloco do botão "Criar Negócio" que aparece em "Visita Realizada", junto com a função `handleCreateNegocio` e estados associados (`criandoNegocio`, `negocioCriado`)
- **`src/hooks/useVisitas.ts`**: Atualizar toast da visita realizada removendo referência ao botão, substituir por "Arraste para 'Negócio Criado' quando estiver pronto"

### 2. Reordenar etapas (migration de dados)
Ordem final:
```text
... → Visita Realizada (6) → Em Evolução (7) → Negócio Criado (8) → Descarte (9)
```
- "Negócio Criado" passa para `ordem = 8`
- "Descarte" passa para `ordem = 9` (última etapa)

### Arquivos afetados
- `src/components/pipeline/PipelineCard.tsx` — remover botão e lógica associada
- `src/hooks/useVisitas.ts` — atualizar mensagem toast
- Update de dados nas ordens das etapas via SQL

