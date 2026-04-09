
# Plano: Corrigir título de atividade para leads Meta Ads

## Problema
O form ID `1253040266458947` (Casa Tua) não está no `META_FORM_ID_MAP`, então o título da atividade fica "Lead gerado via meta_ads — 1253040266458947" — inútil para o corretor.

## Correções

### Arquivo: `supabase/functions/receive-meta-lead/index.ts`

**1. Adicionar form ID faltante ao mapa (linha ~225)**
```
"1253040266458947": "Casa Tua",
```

**2. Melhorar o título da atividade (linha 571)**
Trocar de:
```
titulo: `Lead gerado via ${plataformaLabel}${formName ? ` — ${formName}` : ""}`
```
Para:
```
titulo: `Lead gerado via ${plataformaLabel}${empreendimento ? ` — ${empreendimento}` : ""}`
```
Assim o título fica: **"Lead gerado via Meta Ads — Casa Tua"** em vez do ID numérico.

**3. Manter formName na descrição (linha 564)**
O `formName` já aparece na `descricao` como "Formulário: Casa Tua" — isso continua. Mas se o formName for um ID numérico puro (não mapeado), filtrar para não poluir:
```
if (formName && !/^\d{10,}$/.test(formName)) entradaParts.push(`Formulário: ${formName}`);
```

## Resultado esperado
- Título: "Lead gerado via Meta Ads — Casa Tua"
- Descrição: "Meta Ads • Formulário: Casa Tua • Empreendimento: Casa Tua"
- Se formName for ID numérico não mapeado, ele não aparece na descrição

## Risco
Zero — só muda texto de exibição da atividade, nenhuma lógica de negócio alterada.
