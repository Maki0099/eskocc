## Cíl
Při splnění 100 % zajistit, aby se progress bar nezkracoval kvůli badge "100 %" vpravo — všechny 3 informace (najeto, cíl, procenta) se zobrazí v řádku nad barem a bar se roztáhne přes celou šířku.

## Úprava v `src/pages/Statistics.tsx` (řádky ~385–415, desktop verze)

Aktuálně je layout:
```
[rank] [jméno w-56] [flex-1: km / cíl km + BAR] [badge 100% nebo %]
```
Pravý sloupec s procenty vždy ukrajuje šířku baru.

Nový layout pro desktop:
```
[rank] [jméno w-56] [flex-1: km  /  cíl km  ·  % (vpravo) + BAR přes celou šířku]
```

Konkrétní změny:
1. **Odstranit pravý sloupec s procenty/badge na desktopu** — přesunout procenta do stejného řádku jako "najeto / cíl" uvnitř `flex-1` progress kontejneru.
2. Řádek nad barem bude obsahovat 3 informace v jednom flex řádku:
   - vlevo: `3 218 km` (najetá vzdálenost, `font-semibold`)
   - uprostřed/vpravo: `/ 3 000 km` (cíl, `text-muted-foreground`)
   - úplně vpravo: `100 %` nebo procenta se zelenou barvou při splnění (případně s ikonou `CheckCircle2`)
3. Progress bar zůstane pod tímto řádkem přes plnou šířku `flex-1` sloupce — už se nebude zkracovat.
4. **Mobilní verze** (`md:hidden` blok níže): zachovat, ale sjednotit zobrazení — procenta s ikonou splnění zůstanou nad barem, který je full-width. Odstranit duplicitní pravý sloupec s procenty na mobilu (aktuálně je vpravo od jména).

## Detail — struktura po úpravě (desktop)

```tsx
<div className="flex-1 min-w-0 hidden md:block">
  <div className="flex items-baseline justify-between gap-3 text-sm mb-1.5">
    <span className="font-semibold">{ytd} km</span>
    <span className="text-muted-foreground">/ {target} km</span>
    <span className={isCompleted ? "text-green-600 font-medium flex items-center gap-1" : "font-medium"}>
      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
      {Math.round(progress)} %
    </span>
  </div>
  <Progress value={progress} className="h-3 ..." />
</div>
```

Pravý sloupec (`<div className="flex-shrink-0 text-right ml-auto">…</div>`) se pro desktop odstraní; pro mobil se přeuspořádá tak, aby ukazoval jen km údaje (bar + procenta pak žijí ve spodním mobilním bloku).

## Výsledek
Progress bar má konzistentní šířku pro všechny členy — jak pro rozjeté, tak pro splněné cíle. Splnění je vizuálně odlišeno zelenou barvou procent a check ikonou, ne zkrácením baru.
