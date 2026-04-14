

# Plano: Adicionar "Meu WhatsApp" na Sidebar

## Arquivo

`src/components/layout/Sidebar.tsx`

## Alterações

1. **Import**: Adicionar `Smartphone` ao import de `lucide-react` (linha 3-14)

2. **Corretor** (seção "Ferramentas", ~linha 194-201): Adicionar item:
   ```typescript
   { label: "Meu WhatsApp", path: "/configuracoes/whatsapp", icon: <Smartphone size={15} strokeWidth={1.5} /> },
   ```

3. **Admin** (seção "Ferramentas", ~linha 101-108): Adicionar item:
   ```typescript
   { label: "Meu WhatsApp", path: "/configuracoes/whatsapp", icon: <Smartphone size={15} strokeWidth={1.5} /> },
   ```

## O que NÃO será alterado

- Nenhum outro item de sidebar
- Nenhuma outra rota, hook ou componente
- Apenas 3 pontos de edição no mesmo arquivo

