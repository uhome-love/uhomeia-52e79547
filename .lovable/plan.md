

## Diagnóstico: Tarefas "sumindo" da Central de Tarefas

### Causa raiz

A Central de Tarefas (`MinhasTarefas.tsx`) tem 5 abas de filtro temporal: **Atrasadas**, **Hoje**, **Amanhã**, **Semana** e **Concluídas**. Porém **não existe nenhuma aba para tarefas futuras além da semana atual**.

Dados reais do banco agora:
- **1045 tarefas pendentes** têm data além desta semana → **invisíveis em todas as abas**
- 757 atrasadas, 403 hoje, 112 amanhã, 22 semana

Ou seja, **45% das tarefas pendentes não aparecem em lugar nenhum**. Quando um corretor cria uma tarefa com data para a próxima semana ou adiante, ela "desaparece".

### Correção

**Arquivo: `src/pages/MinhasTarefas.tsx`**

1. Adicionar nova aba **"📋 Todas"** que mostra todas as tarefas pendentes, sem filtro de data, ordenadas por `vence_em`.

2. Atualizar o tipo `TabFilter` para incluir `"todas"`.

3. No `filteredTarefas`, quando `activeTab === "todas"`, retornar `pendentes` (todas as pendentes).

4. Mudar o **tab padrão** de `"hoje"` para `"todas"` — assim o corretor vê tudo ao abrir, e pode filtrar por dia se quiser.

5. Adicionar contador de "Todas" no resumo superior.

### Impacto

- Zero alteração de banco ou RLS
- Todas as tarefas criadas pelo corretor (via lead detail, ação rápida, ou botão "Nova Tarefa") passam a ser visíveis na central
- Tabs existentes continuam funcionando como filtros rápidos

