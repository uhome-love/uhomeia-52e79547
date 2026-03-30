

## Diagnostic Result

The large cards you see are rendered in **`src/components/pipeline/RadarImoveisTab.tsx`**, NOT in `LeadMatchesWidget.tsx`.

### Exact location
- **Line 1391**: `<div className="grid grid-cols-1 md:grid-cols-2 gap-2">` — the 2-column grid
- **Line 1401**: `<div className="relative w-full h-[120px] bg-muted overflow-hidden">` — the 120px tall image
- **Lines 1392-1500+**: Full card rendering with `<Card>`, `<CardContent>`, justificativa pills, action buttons

### Why previous changes didn't work
All previous prompts targeted `LeadMatchesWidget.tsx`, which renders inside a **different sub-tab** ("Matches"). The main search results grid lives in `RadarImoveisTab.tsx` under the "radar" sub-tab — which is the default view users see.

### Plan — Convert RadarImoveisTab cards to compact horizontal list

**File**: `src/components/pipeline/RadarImoveisTab.tsx` (lines ~1390-1500)

**Changes**:
1. Replace `grid grid-cols-1 md:grid-cols-2 gap-2` container with a bordered list container (`border: 0.5px solid var(--border)`, `borderRadius: 10`, `overflow: hidden`)
2. Replace each `<Card>` with a flex row: `display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 0.5px solid var(--border)`
3. Replace `h-[120px]` image with `64×64px` thumbnail (borderRadius 8, objectFit cover), score badge overlaid at bottom-right (9px font)
4. Info section (flex: 1, min-width: 0): name (12px/600, truncated), price (12px/600, #4F46E5), details line (10px, muted — bairro · dorms · m²)
5. Keep selection checkbox (move to left of photo or overlay), favorite/discard/sent actions on the right
6. Keep all onClick handlers, toggleSelect, handleFavorite, handleDiscard logic intact
7. Apply same treatment to both `top4` and `rest` arrays

**Not changed**: Search button, IA+, Vitrine, filters, profile form, Typesense logic, WhatsApp logic, sub-tabs, Le