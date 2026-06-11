## Cíl
V admin panelu zobrazit informaci o aktuální verzi buildu (git commit hash + datum buildu), aby bylo jasné, že na www.eskocc.cz běží nejnovější verze.

## Co se změní

### 1. Vite konfigurace (`vite.config.ts`)
- Injectovat do buildu dva údaje jako `import.meta.env` proměnné:
  - `VITE_COMMIT_HASH` – zkrácený git commit hash (`GITHUB_SHA` v CI, lokálně z `git rev-parse`)
  - `VITE_BUILD_DATE` – ISO timestamp buildu
- Použít sekci `define` ve Vite configu, aby byly dostupné v runtime.

### 2. Admin panel (`src/pages/Admin.tsx`)
- V hlavičce admin panelu (pod nadpisem nebo vedle něj) přidat kompaktní verzovací řádek:
  - Commit hash (7 znaků) – klikatelný odkaz na příslušný commit na GitHubu
  - Formátované datum a čas buildu (česky)
  - Počet dní/hodin od buildu (např. „před 2 hodinami“)

## Technické detaily
- Commit hash se bere z `process.env.GITHUB_SHA` v CI, fallback na lokální `git rev-parse --short HEAD`.
- GitHub repo URL se odvodí z `process.env.GITHUB_REPOSITORY` nebo bude hardcoded `github.com/...` (podle stávajícího repo).
- Build date se generuje přímo v `vite.config.ts` při každém buildu.
- Styling bude nenápadný (muted text, malé písmo), aby nerušil hlavní obsah.

## Soubory k úpravě
- `vite.config.ts`
- `src/pages/Admin.tsx`