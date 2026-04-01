

# Diagnóstico e Correção da Distribuição de Leads (Roleta)

## O que aconteceu com o Gustavo

Auditoria completa do dia 01/04:

| Lead | Empreendimento | Horário criação | Horário distribuído | Via |
|------|---------------|-----------------|--------------------|----|
| GabrieI Lando | Orygem | 12:49:12 | 12:49:15 | Single (tem "distribuido" no histórico) |
| Rodrigo Lorenzi | Shift | 03:29 | 12:49:34.444 | Batch (SEM registro no histórico) |
| anelize machado | Connect JW | 03:59 | 12:49:34.444 | Batch (SEM registro no histórico) |
| ISABELA | Connect JW | 04:14 | 12:49:34.445 | Batch (SEM registro no histórico) |

Os 3 leads (Shift + 2 Connect JW) foram distribuídos no **mesmo milissegundo** via batch dispatch (provavelmente pelo CEO/gestor). Todos foram para o Gustavo porque o algoritmo de balanceamento falhou.

---

## 3 Bugs Identificados

### Bug 1 — Race Condition no Processamento Paralelo (CRÍTICO)
O batch dispatch processa leads em **chunks de 5 em paralelo** (`Promise.all`). Todos os leads do chunk leem os **mesmos contadores** simultaneamente, veem Gustavo com 0 leads, e todos escolhem ele.

```text
Chunk [Lead A, Lead B, Lead C] → Promise.all
  Lead A: lê contador Gustavo=0 → escolhe Gustavo
  Lead B: lê contador Gustavo=0 → escolhe Gustavo (mesmo estado!)
  Lead C: lê contador Gustavo=0 → escolhe Gustavo (mesmo estado!)
```

Os updates de contador nas linhas 363-370 ocorrem **depois** de cada `await`, mas dentro do `Promise.all` são concorrentes — a atualização de um não é visível para o outro.

### Bug 2 — Batch Dispatch NÃO registra no `distribuicao_historico` 
O caminho batch (linhas 303-420) insere em `roleta_distribuicoes` e `notifications`, mas **NÃO insere em `distribuicao_historico`**. Como o algoritmo de balanceamento conta leads a partir dessa tabela, leads distribuídos via batch ficam invisíveis para distribuições futuras.

### Bug 3 — `segmento_id` sempre NULL no histórico (Single Path)
Linha 656 do `distribute-lead/index.ts`:
```typescript
segmento_id: segmentoId ? undefined : undefined  // BUG: sempre undefined!
```
Deveria ser `segmento_id: segmentoId || undefined`. O balanceamento por segmento nunca funciona porque o segmento nunca é registrado.

---

## Plano de Correção

### Passo 1 — Eliminar processamento paralelo (Bug 1)
Remover `Promise.all` e processar leads **sequencialmente**. Após atribuir cada lead, atualizar os contadores in-memory antes de processar o próximo. Isso garante que o segundo lead veja que o primeiro já foi para Gustavo.

### Passo 2 — Adicionar `distribuicao_historico` insert no batch path (Bug 2)
Dentro do loop de batch dispatch (após o `pipeline_leads.update`), inserir o registro no histórico com `acao: "distribuido"` e o `segmento_id` correto — igual ao que já existe no single path.

### Passo 3 — Corrigir segmento_id no histórico (Bug 3)
Corrigir a linha 656 de:
```typescript
segmento_id: segmentoId ? undefined : undefined
```
Para:
```typescript
segmento_id: segmentoId || null
```

### Passo 4 — Tornar o insert do histórico `await` (não fire-and-forget)
Tanto no batch quanto no single path, o insert no `distribuicao_historico` deve ser **awaited** para garantir que a contagem esteja correta antes de processar o próximo lead.

---

## Resultado Esperado

Com estas 4 correções:
- Cada lead do batch será processado um de cada vez, garantindo distribuição igualitária
- O histórico vai registrar corretamente segmento + acao para todos os caminhos
- O balanceamento por segmento vai funcionar (hoje está cego pois segmento é sempre NULL)

