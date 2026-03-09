# Resumo da Sessão — 09/03/2026 (UhomeSales / UhomeIA)

## Contexto do Projeto
CRM imobiliário para corretores, gerentes e CEO. Stack: React + Vite + Tailwind + Supabase (Lovable Cloud). Tabela principal de leads: `pipeline_leads` (tabela antiga `leads` renomeada para `leads_legado`).

---

## 1. FIX — Salvar Visita (erro de enum)
**Problema:** Ao criar/editar visita na Agenda, erro `operator does not exist: pipeline_stage_type = text` — PostgREST não consegue comparar enum `tipo` da tabela `pipeline_stages` com texto via `.or()`.
**Solução:** Refatoramos as queries em `useVisitas.ts` para buscar stages por `.ilike("nome", "%visita realizada%")` em vez de filtrar pela coluna enum `tipo`.

---

## 2. BUGFIXES CRÍTICOS + Sistema de Tarefas (prompt grande)

### 2.1 Foreign Keys quebradas
- Dropamos FKs que apontavam para `leads_legado` nas tabelas: `lead_messages`, `lead_tasks`, `negocios`, `pos_vendas`, `lead_progressao`, `roleta_distribuicoes`, `visitas`.
- Verificamos e limpamos todas as referências.

### 2.2 Oferta Ativa — Pop-up duplicado
- Ao finalizar ligação, abria 2 modais de resultado.
- Adicionamos flag `isSubmitting` / guard em `DialingModeWithScript.tsx` para evitar dupla abertura.

### 2.3 Agenda de Visitas — Criar visita com lead do pipeline
- O select de clientes passou a buscar de `pipeline_leads`.
- `lead_id` da tabela `visitas` teve NOT NULL removido (já dropamos FK).

### 2.4 Pipeline — Visita Marcada → Visita Realizada
- Separamos UPDATE de stage_id da criação do negócio com try-catch.
- A mudança de etapa nunca reverte por erro na criação do negócio.

### 2.5 Busca completa por referências à tabela antiga
- `from('leads')` → `from('pipeline_leads')` em todo o codebase.
- Mapeamento de campos: `user_id` → `corretor_id`, `interesse` → `empreendimento`, etc.

### 2.6 Sistema de Tarefas (pipeline_tarefas)
- Adicionamos colunas `tipo` (text) e `hora_vencimento` (time) à tabela `pipeline_tarefas`.
- Tab "Tarefas" no modal do lead (`PipelineLeadDetail.tsx`): criar tarefa com tipo, data, hora.
- Página `MinhasTarefas.tsx` com filtros Hoje/Amanhã/Semana/Atrasadas.
- Rota `/minhas-tarefas` adicionada ao `App.tsx` e sidebar.

---

## 3. Mapeamento de Empreendimentos (leads sem empreendimento)
**Problema:** Leads vindos de Facebook/TikTok Ads sem campanha identificável ficam com `empreendimento = NULL`, prejudicando distribuição por segmento.
**Análise:** Função `extractCampanha` no `jetimob-sync` não reconhece padrões desses leads. Identificamos 11 leads sem empreendimento.
**Status:** Aguardando decisão do usuário sobre como mapear (por faixa de valor, fallback "Avulso", etc.).

---

## 4. Transformar "Prioridades Agora" em "Minha Agenda" (último prompt)

### 4.1 Widget "📋 Minha Agenda" no Dashboard
- **Removemos** a seção "Prioridades Agora" do `CorretorHome.tsx`.
- **Substituímos** pelo novo componente `MinhaAgendaWidget.tsx`:
  - Mostra tarefas atrasadas (border vermelho), próximas de hoje (amarelo), futuras (cinza).
  - Ações rápidas: Ligar, WhatsApp, Feito (conclui + atualiza `ultima_acao_at`), Adiar (1h, 2h, Amanhã, ou data custom).
  - Preview de tarefas de amanhã.
  - Link "Ver agenda completa" → `/minhas-tarefas`.
  - Estado vazio com dica para criar tarefas.

### 4.2 Página "Minhas Tarefas" melhorada
- Reescrita completa de `MinhasTarefas.tsx`:
  - Summary bar: Hoje X pendentes · Atrasadas Y · Amanhã Z · Semana W.
  - Tabs: Atrasadas, Hoje, Amanhã, Semana, Concluídas.
  - Botão **➕ Nova Tarefa** com modal: busca de lead, tipo, data/hora, observação.
  - Cards com `border-l` colorido por status (vermelho/amarelo/cinza/verde).
  - Adiar com opções rápidas (1h, 2h, Amanhã) ou data/hora custom.

### 4.3 Badge na Sidebar
- Sidebar do corretor mostra badge com contagem de tarefas pendentes (atrasadas + hoje) na rota `/minhas-tarefas`.
- Query automática a cada 60s.

### 4.4 Próxima tarefa no card do Pipeline (Kanban)
- `PipelineCard.tsx` recebe nova prop `proximaTarefa`.
- Exibe linha no card: 🔴 Atrasado / 🟡 Hoje / 📋 dd/MM · tipo.
- `PipelineBoard.tsx` faz query batch de `pipeline_tarefas` (pendentes) e monta mapa lead_id → tarefa mais próxima.

---

## Arquivos Criados/Editados Hoje

### Criados:
- `src/components/corretor/MinhaAgendaWidget.tsx`
- `supabase/migrations/20260309180320_*.sql` (colunas tipo + hora_vencimento em pipeline_tarefas)

### Editados:
- `src/hooks/useVisitas.ts` — fix enum comparison
- `src/hooks/usePipelineLeadData.ts` — task creation logic
- `src/hooks/useCorretorHomeData.ts` — (consulta mantida)
- `src/components/corretor/CorretorHome.tsx` — substituiu FollowUpsDoDia por MinhaAgendaWidget
- `src/components/pipeline/PipelineLeadDetail.tsx` — tab tarefas enhanced
- `src/components/pipeline/PipelineCard.tsx` — prop proximaTarefa + render
- `src/components/pipeline/PipelineBoard.tsx` — query tarefas + pass tarefasMap
- `src/components/AppSidebar.tsx` — badge tarefas pendentes
- `src/components/oferta-ativa/DialingModeWithScript.tsx` — fix popup duplicado
- `src/pages/MinhasTarefas.tsx` — reescrita completa
- `src/App.tsx` — rota /minhas-tarefas

---

## Pendências / Próximos Passos
1. **Mapeamento de empreendimentos** — definir regra para leads Facebook/TikTok sem campanha.
2. **Tarefas automáticas** — ao receber lead da roleta (criar "Primeiro contato"), ao criar visita (criar "Confirmar visita 1 dia antes"), ao mover para "Contato Iniciado" (criar "Follow-up 24h").
3. **Testar fluxos completos** — pipeline drag, criar visita, oferta ativa, concluir tarefa.

---

## Estrutura da Tabela `pipeline_tarefas` (atual)
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| pipeline_lead_id | uuid (NOT NULL) |
| titulo | text (NOT NULL) |
| descricao | text |
| prioridade | text (default 'media') |
| status | text (default 'pendente') |
| responsavel_id | uuid |
| vence_em | date |
| concluida_em | timestamptz |
| created_by | uuid (NOT NULL) |
| created_at | timestamptz |
| updated_at | timestamptz |
| tipo | text (default 'follow_up') |
| hora_vencimento | time |
