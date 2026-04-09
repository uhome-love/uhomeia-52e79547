

# Plano: Cards Compactos + Ocultar Listas Esgotadas

## Problema
1. Listas esgotadas (naFila === 0) continuam visíveis com `opacity-50`, poluindo a tela
2. Cards são grandes demais (stats em fonte 32px, progress bar, etc.) — quando há muitas listas, o corretor precisa rolar demais
3. O formato grid de cards grandes não escala bem para 10+ listas

## Solução

### 1. Ocultar listas esgotadas
- Em todas as views (campanhas, listas), filtrar items onde `naFila === 0` do `statsMap`
- Adicionar um toggle discreto no final: "Mostrar X listas esgotadas" para o corretor poder ver se quiser, mas **desativado por padrão**
- Campanhas onde **todas** as listas estão esgotadas também ficam ocultas

### 2. Redesenhar cards para formato compacto em lista
Trocar o grid de cards grandes por **rows compactas**, uma por linha:

```text
┌─────────────────────────────────────────────────────────┐
│ 🏠 Casa Tua        12 na fila · 5 aproveit. · 45 total │ ████░░ 73%  │ [▶ Iniciar] │
│ 🏠 Botanique        8 na fila · 3 aproveit. · 30 total │ ███░░░ 60%  │ [▶ Iniciar] │
│ 📂 Campanha Sul     20 na fila · 8 aproveit. · 60 total│ ██░░░░ 33%  │ [▶ Iniciar] │
└─────────────────────────────────────────────────────────┘
```

Cada row: ~48px de altura. Contém:
- Nome (bold) + campanha (subtle, se houver)
- Stats inline: "12 na fila · 5 aproveitados · 45 total"
- Mini progress bar (inline, ~80px de largura)
- Botão verde "Iniciar" compacto no lado direito
- Badge de tentativas do dia (se > 0)

### 3. Campanhas view — mesmo padrão compacto
Campanhas também viram rows, não cards. O ícone 📂 diferencia de lista individual.

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `src/components/oferta-ativa/CorretorListSelection.tsx` | Redesenhar ListaCard → ListaRow compacta, filtrar esgotadas, toggle "mostrar esgotadas" |

## Risco
Baixo. Apenas visual. Nenhuma lógica de negócio muda. O click handler e a seleção de lista permanecem idênticos.

