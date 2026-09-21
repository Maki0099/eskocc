# Zjednodušení mobilního menu a zarovnání loga

## Cíl
Urychlit orientaci přihlášeného člena v mobilním hamburger menu a vizuálně přitáhnout logo k levému okraji.

## Co se změní

### 1. Přihlášený uživatel přímo v mobilním menu
- V `Header.tsx` se uživatelská karta (avatar + zkrácené jméno) přesune na začátek mobilního menu panelu, takže je vidět ihned po otevření.
- Jméno se zobrazí ve formátu **„Jméno P.“** (např. „Tomáš M.“), aby karta byla kompaktní.
- Karta zůstane klikací a povede na profil člena.
- Samostatná položka **„Můj profil“** se z mobilního menu odstraní, aby se menu zkrátilo — odkaz zůstane skrytý pod kartou.
- Ostatní odkazy (Nastavení účtu, Dashboard, Notifikace, Odhlásit se) zůstanou v dolní části menu.

### 2. Logo ESKO.CC vlevo
- V hlavičce se upraví vnější kontejner tak, aby na mobilních obrazovkách začínal až u levého okraje displeje, nikoliv uvnitř zúženého kontejneru.
- Na desktopu zůstane stávající max-width/centrování, aby se layout nerozpadl.

## Technické kroky

1. `src/lib/user-utils.ts`
   - Přidat helper `formatShortName(fullName: string | null): string`, který vrací "Jméno P." nebo původní řetězec, pokud příjmení není rozpoznatelné.

2. `src/components/layout/Header.tsx`
   - Upravit wrapper hlavičky: `container mx-auto px-4` → `w-full px-4 lg:container lg:mx-auto` (nebo ekvivalent), aby logo na mobilu by u kraje.
   - V mobilním menu panelu přesunout uživatelskou kartu na začátek `<nav>`.
   - Použít nový helper pro zobrazení jména.
   - Karta se obalí do `<Link to={getMemberProfilePath(user.id)}>` s `onClick={() => setIsMenuOpen(false)}`.
   - Odstranit samostatný odkaz **Můj profil** z dolního panelu.
   - Nepřihlášený stav zůstane beze změny.

3. Ověření
   - Build (`bun run build`) bez chyb.
   - Playwright: otevřít mobilní menu, zkontrolovat, že nahoře je avatar + „Jméno P.“ a karta vede na profil.
   - Zkontrolovat, že logo není odsunuto od levého okraje na mobilu a že desktop layout zůstal v kontejneru.

## Omezení / bezpečnost
- Žádné změny backendu, autentizace ani RLS.
- Formát jména je čistě prezentační; neukládá se do databáze.
