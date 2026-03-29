

## Integrar Dados Reais de Conversão do CRM nos Playbooks do HOMI

### O que vamos fazer

Adicionar uma seção de **dados reais de performance** em cada playbook do `homi-assistant`, para que a IA use taxas de conversão reais ao orientar corretores (ex: priorizar produtos com melhor taxa, alertar sobre no-show alto).

### Dados reais extraídos do CRM

| Empreendimento | Leads | Lead→Visita | Visita→Conversão | No-show |
|---|---|---|---|---|
| Open Bosque | 492 | 9.3% | 80% | 20% |
| Las Casas | 131 | 10.7% | 29% | **54%** |
| Orygem | 170 | 7.1% | 56% | 29% |
| Shift | 81 | - | - | 0% |
| Connect JW | - | - | - | - |

### Mudança

**Arquivo: `supabase/functions/homi-assistant/index.ts`**

Adicionar em cada playbook (Las Casas, Open Bosque, Orygem, Shift) uma seção `📊 DADOS REAIS DE PERFORMANCE` com:

- Taxa lead→visita
- Taxa visita→conversão
- Taxa de no-show
- Insight operacional para a IA usar (ex: "Las Casas tem 54% no-show — SEMPRE confirmar visita na véspera e no dia")

Adicionar uma seção geral `COMPARATIVO DE PERFORMANCE` (depois da lógica de direcionamento, linha ~267) com a tabela completa + regras de decisão:

- "Open Bosque converte 80% das visitas — produto de volume, foco é GERAR visita"
- "Las Casas tem alto no-show (54%) — investir em confirmação e criar urgência pré-visita"
- "Orygem tem funil saudável (56% conversão) — foco é qualificação antes da visita"
- "Shift tem 0% no-show — leads mais qualificados, foco é conduzir para proposta"

### Onde entra em cada playbook

Para cada produto, logo após `✅ SCRIPTS DE ABORDAGEM`, inserir:

```
📊 DADOS REAIS (CRM):
• Taxa lead→visita: X%
• Conversão pós-visita: X%
• No-show: X%
• INSIGHT: [orientação específica]
```

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `supabase/functions/homi-assistant/index.ts` | Seções de dados reais em cada playbook + comparativo geral de performance |

### O que NAO muda
- Nenhum outro arquivo ou edge function
- Scripts e playbooks existentes permanecem intactos
- Apenas ADIÇÃO de informação, sem remoção

