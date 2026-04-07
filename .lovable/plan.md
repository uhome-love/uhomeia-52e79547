

## Corrigir distribuição: segment ID mismatch entre RPC e roleta_fila

### Problema raiz

Existem **duas tabelas de segmentos** com os mesmos nomes mas **UUIDs diferentes**:

```text
Segmento           pipeline_segmentos ID           roleta_segmentos ID
─────────────────  ──────────────────────────────  ──────────────────────────────
Médio-Alto Padrão  c8b24415-3dc1-4f65-aae1-...     d364f084-a63b-4be3-892e-...
Altíssimo Padrão   5e930c09-634d-40e1-9ccc-...     93ca556c-9a32-4fb8-b1af-...
MCMV / Até 500k    21180d72-f202-4d29-96cb-...     9948f523-29f4-46a7-bc1b-...
Investimento       dd96ad01-7e76-40e9-8324-...     409aeddf-077f-473a-97cc-...
```

- **Trigger** (`trg_auto_distribute_lead`): Busca segmento via `roleta_campanhas` → retorna `roleta_segmentos` IDs ✅ (compatível com `roleta_fila`)
- **RPC** (`distribuir_lead_atomico`): Busca segmento via `pipeline_segmentos` → retorna IDs **incompatíveis** com `roleta_fila` ❌

Resultado: quando o CEO tenta disparar da Fila, o RPC encontra `v_segmento_id = c8b24415...` mas nenhum corretor na `roleta_fila` tem esse ID. Retorna `no_broker_available`.

Os 12 leads na fila chegaram de madrugada (antes dos credenciamentos serem aprovados ~8:45 BRT), então o trigger corretamente não os distribuiu. Mas agora que há corretores ativos, o despacho manual via RPC falha por causa do mismatch.

### Solução

Uma migration que atualiza o `distribuir_lead_atomico` para buscar o segmento via `roleta_campanhas` (igual ao trigger), em vez de `pipeline_segmentos`:

```sql
-- ANTES (quebrado — usa pipeline_segmentos com IDs incompatíveis):
SELECT id INTO v_segmento_id
FROM public.pipeline_segmentos
WHERE ativo = true
  AND v_emp_lower = ANY(SELECT lower(trim(unnest(empreendimentos))))
LIMIT 1;

-- DEPOIS (correto — usa roleta_campanhas com roleta_segmentos IDs):
SELECT segmento_id, COALESCE(ignorar_segmento, false)
INTO v_segmento_id, v_ignora_segmento_camp
FROM public.roleta_campanhas
WHERE ativo = true
  AND (
    lower(trim(empreendimento)) = v_emp_lower
    OR v_emp_lower LIKE '%' || lower(trim(empreendimento)) || '%'
    OR lower(trim(empreendimento)) LIKE '%' || v_emp_lower || '%'
  )
LIMIT 1;

IF v_ignora_segmento_camp THEN
  v_segmento_id := NULL;
  v_ignora_segmento := TRUE;
END IF;
```

Isso alinha a lógica do RPC com a do trigger — ambos usam `roleta_campanhas` → `roleta_segmentos` IDs → match correto com `roleta_fila.segmento_id`.

### Resultado
- Despacho manual da Fila do CEO volta a funcionar imediatamente
- Os 12 leads pendentes poderão ser distribuídos
- Lógica fica consistente entre trigger e RPC

