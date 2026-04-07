

# Plano: Etapa "Em Evolução" + Renomear "Convertido" → "Negócio Criado"

## Fluxo atualizado

```text
... → Visita Realizada → Em Evolução → Negócio Criado (cria negócio automaticamente)
                              ↑                 ↑
                    Lead ainda decidindo    Arrasta aqui = cria negócio
```

## Mudanças

### 1. Migration SQL
- Inserir etapa "Em Evolução" (`tipo: em_evolucao`, `ordem: 7`)
- Renomear etapa "Convertido" para "Negócio Criado" (mantém `tipo: convertido`, `ordem: 9`)
- Reordenar "Descarte" para `ordem: 8`

### 2. Lógica de negócio (`src/hooks/usePipeline.ts`)
- Remover criação automática de negócio ao mover para "Visita Realizada"
- Manter criação automática apenas ao mover para etapa tipo `convertido` ("Negócio Criado")

### 3. Visual (`src/lib/celebrations.ts`)
- Adicionar tema/cores para "Em Evolução" (azul/cyan)

### 4. StageCoachBar
- Adicionar mensagens e ações para a etapa `em_evolucao`

### 5. Relatórios
- Incluir "Em Evolução" nas métricas do `RelatoriosTab.tsx`

## Arquivos afetados
- Nova migration SQL
- `src/hooks/usePipeline.ts`
- `src/lib/celebrations.ts`
- `src/components/pipeline/StageCoachBar.tsx`
- `src/components/checkpoint/RelatoriosTab.tsx`

