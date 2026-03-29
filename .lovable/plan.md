

## Refinamento Visual dos Botões do Card

Olhando o screenshot com olhar crítico: os botões estão funcionais mas com alguns problemas de acabamento:

1. **Ligar** com fundo `#EEEDFE` está lavado — parece um botão desabilitado, não um CTA primário
2. **Alinhamento vertical** entre os 4 botões não está perfeito — o Ligar tem `margin: 4px` que desalinha
3. **Peso visual** desigual — Ligar tem fundo mas os outros são fantasma, criando desequilíbrio
4. O emoji 💬 do WhatsApp pode renderizar com tamanho diferente dependendo do OS

### Proposta — design mais limpo e equilibrado

Todos os 4 botões no mesmo plano visual (sem fundo destacado), diferenciados apenas por **cor do texto/ícone**:

```text
┌─────────────────────────────────────────────┐
│  📞 Ligar  │  📋 Tarefa  │  💬 WhatsApp │ ··· │
│  #4F46E5   │  #64748b    │  #16a34a     │ #9ca │
└─────────────────────────────────────────────┘
```

- **Ligar**: texto/ícone `#4F46E5` (roxo primário), sem fundo. Hover: `background: #EEEDFE`
- **Tarefa**: texto/ícone `#64748b` (cinza médio). Hover: `background: hsl(var(--muted))`  
- **WhatsApp**: texto/ícone `#16a34a` (verde). Hover: `background: #EAF3DE`
- **···**: texto `#9ca3af`. Hover: `background: hsl(var(--muted))`

### Detalhes técnicos

**CardActionBar.tsx** — 3 mudanças:
1. Remover `background: "#EEEDFE"`, `borderRadius`, `margin` do botão Ligar — fica `background: "transparent"`, hover muda para `#EEEDFE`
2. Padronizar `padding: "8px 4px"` e `minHeight: 36` em todos
3. Manter separadores verticais entre botões

**CardQuickTaskPopover.tsx** — 1 mudança:
1. Atualizar cor do botão Tarefa de `#1a1a1a` para `#64748b` para harmonizar

### Resultado
Botões visualmente equilibrados, limpos, com identidade cromática clara por função. Sem fundos que competem com o conteúdo do card.

### Arquivos alterados
- `src/components/pipeline/CardActionBar.tsx`
- `src/components/pipeline/CardQuickTaskPopover.tsx`

