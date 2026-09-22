# Výchozí tep a výkon u sdílených jízd + označení sdílení

## Cíl
1. Nové sdílené odkazy mají ve výchozím stavu zapnuté zobrazování tepu a výkonu (biometrie).
2. Na veřejné stránce sdílené jízdy (`/s/:token`) je vidět, že jde o sdílenou trasu.

## Co se změní

### 1. Výchozí biometrie (tep, výkon)
- `src/components/share/ShareLinkDialog.tsx` — přepínač „Zobrazit tep a výkon" bude u nově vytvářeného odkazu výchozí **zapnutý**; stále ho lze kdykoli vypnout.
- `src/lib/share-links.ts` — `createShareLink` dostane výchozí hodnotu `include_biometrics: true`.
- Existující odkazy se nemění — u nich zůstane nastavení, jaké člen zvolil (případně přepne přepínačem).

### 2. Označení „trasa byla sdílena"
- `src/pages/SharedView.tsx` — přidá se výrazné, ale decentní označení u trasy/jízdy:
  - U detailu jízdy (karta se statistikami i v dialogu trasy v rámci sdíleného profilu) pás/štítek „Sdílená trasa od {jméno člena}" s ikonou sdílení a textem, že data pocházejí z klubu ESKO.cc.
  - U profilového sdílení štítek „Sdílený profil člena" v hlavičce pod jménem.
- Použije se stávající badge/styl projektu (žádné nové barvy, drží se designových tokenů).

## Technické poznámky
- Žádná změna databáze — sloupec `include_biometrics` už existuje, mění se jen výchozí hodnota ve frontendu.
- Ověření: typecheck, pak Playwright kontrola stránky `/s/testtoken123456789abcd` — zobrazený štítek a tep/watty u jízdy.
