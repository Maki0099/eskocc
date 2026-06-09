# Oprava záložek admin panelu pro mobil

## Problém
V `src/pages/Admin.tsx` je 10 záložek (`TabsList` s `flex-wrap`). Na mobilu se chaoticky lámou do několika řádků a ikony+texty nejsou čitelné.

## Řešení
Responzivní přepínač sekcí:

- **Mobil (`< md`)**: místo záložek zobrazit `Select` dropdown s ikonou + názvem aktuální sekce. Položky dropdownu obsahují ikonu, název a badge (počet nových uživatelů u "Uživatelé"). Šetří místo a vypadá nativně.
- **Desktop (`≥ md`)**: zachovat současný `TabsList` s `flex-wrap` (funguje dobře, na širokých displejích se vejde na 1–2 řádky).

Hodnota `activeTab` zůstává sdílená — `<Tabs value=… onValueChange=…>` obaluje obě varianty, takže `TabsContent` funguje beze změny.

## Implementace

Soubor: `src/pages/Admin.tsx`

1. Vytvořit pole konfigurace záložek (id, label, ikona) nad JSX, aby se neopakovalo mezi mobilní a desktopovou variantou.
2. Před `<TabsList>` přidat mobilní variantu:
   ```tsx
   <div className="md:hidden">
     <Select value={activeTab} onValueChange={setActiveTab}>
       <SelectTrigger className="w-full">
         <SelectValue />
       </SelectTrigger>
       <SelectContent>
         {tabs.map(t => (
           <SelectItem key={t.id} value={t.id}>
             <span className="flex items-center gap-2">
               <t.icon className="w-4 h-4" />
               {t.label}
               {t.id === "users" && pendingCount > 0 && (
                 <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">{pendingCount}</Badge>
               )}
             </span>
           </SelectItem>
         ))}
       </SelectContent>
     </Select>
   </div>
   ```
3. `TabsList` zabalit do `<div className="hidden md:block">` a změnit `flex-wrap` třídu zůstává.
4. Import `Select*` z `@/components/ui/select` (už používáno jinde v projektu).

Žádné změny v business logice ani v `TabsContent` blocích.

## Co se NEmění
- Funkčnost záložek, počítání `pendingCount`, obsah sekcí.
- Desktop vzhled.
