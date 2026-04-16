

## Plano: Tab Vendas da Central de Relatórios

### Descobertas do schema (adaptações necessárias vs spec)

A spec referencia colunas que não existem. Adaptações ao schema real:

| Spec | Schema real |
|------|-------------|
| `valor_vgv` | `vgv_final` (fallback `vgv_estimado`) |
| `data_venda` | `data_assinatura` |
| `segmento` (na negocios) | Não existe — buscar via `pipeline_leads.segmento_id` (join por `pipeline_lead_id`) |
| `empreendimento_id` + tabela `empreendimentos` | Não existe — usar campo texto `negocios.empreendimento` |
| `pipeline_parcerias.negocio_id` | Não existe — join via `pipeline_lead_id` |
| Status "Confirmada"/"Pendente" | Usar `fase`: vendido=Confirmada, assinado=Pendente, distrato=Distrato |
| Equipe (gestor nome) | Via `team_members.gerente_id` → `profiles.nome` |

### Arquivos

**1. Criar `src/components/relatorios/RelatorioVendas.tsx`** (~450 linhas)

- Props: `filters` + `userRole`
- `getDateRange(filters)` — retorna start/end Date em BRT
- `getPeriodoAnterior(start, end)` — período anterior de mesma duração
- Fetch vendas do período atual e anterior da tabela `negocios` (fase IN vendido, assinado)
- Join parcerias via `pipeline_parcerias` usando `pipeline_lead_id`
- Lookup segmento via `pipeline_leads.segmento_id` dos negócios com `pipeline_lead_id`
- Lookup equipe/gestor via `team_members` + `profiles`
- Filtros dinâmicos: corretor, equipe (via team_members.gerente_id → profiles), segmento
- VGV efetivo: se parceria existe → `vgv * (divisao_principal / 100)`, senão → vgv completo

**KPI Cards** (4 colunas, grid):
1. VGV Total — soma vgvEfetivo, formato R$ XM/Xk, variação % vs anterior
2. Nº de Vendas — count, diferença absoluta
3. Ticket Médio — VGV/count, variação %
4. Comissão Estimada — VGV × 0.03, subtítulo fixo

**Gráfico de Barras** (recharts):
- Agrupamento por hora/dia/semana/mês conforme período
- Bar fill #4F46E5, tooltip branco

**Tabela de Vendas**:
- Colunas: Corretor, Equipe, Empreendimento, VGV, Segmento, Data, Status
- Busca por corretor/empreendimento
- Ordenação clicável em todas as colunas
- Paginação 20/página
- Badges de segmento e status com cores específicas
- Loading shimmer + empty state com ShoppingBag

**2. Modificar `src/pages/ReportCenter.tsx`**

- Import `RelatorioVendas`
- Quando `activeTab === "vendas"` → renderizar `<RelatorioVendas filters={filters} userRole={userRole} />`
- Demais tabs → manter `<ReportPlaceholder />`

### Nenhum outro arquivo alterado

