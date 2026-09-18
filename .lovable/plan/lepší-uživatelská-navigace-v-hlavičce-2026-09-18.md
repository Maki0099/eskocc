# Lepší uživatelská navigace v hlavičce

## Cíl
Po přihlášení bude v hlavičce vidět jméno a avatar přihlášeného člena. Kliknutím na něj se otevře menu s rychlými odkazy: **Můj profil**, **Nastavení účtu**, **Dashboard** a **Odhlásit se**. Na mobilu se stejné odkazy objeví v bočním menu místo samostatného tlačítka Dashboard.

## Co se změní

### Hlavička (desktop)
- Vedle zvonku notifikací se zobrazí avatar + jméno člena.
- Kliknutí otevře dropdown s odkazy na `/member/[id]`, `/account`, `/dashboard` a tlačítkem Odhlásit se.
- Ponechá se stávající tlačítko Dashboard pro rychlý přístup, dokud ho uživatelé nezvyknou nahradit menu.

### Mobilní menu
- V dolní části menu přibude uživatelská karta s avatarem, jménem a e-mailem.
- Pod ní odkazy: Můj profil, Nastavení účtu, Dashboard, Odhlásit se.
- Stávající tlačítko Dashboard se přesune do této skupiny.

### Data
- `Header.tsx` načte z `member_profiles_public` jen `full_name` a `avatar_url` podle `user.id`.
- Použije se stávající `Avatar` komponenta a `getInitials` z `@/lib/user-utils`.
- Loading stav: místo jména se zobrazí skeleton nebo ikona User, dokud se profil nenačte.

## Soubory
- `src/components/layout/Header.tsx` – hlavní úprava hlavičky a mobilního menu.
- `src/components/ui/dropdown-menu.tsx` (pokud existuje, jinak se využije stávající `Popover` nebo `Button`) – dropdown pod avatarem.
- `src/lib/routes.ts` – případně se nepoužije, protože `/member/[id]` je dynamická cesta z `ROUTE_PATTERNS`.

## Technické kroky
1. Přidat lokální stav `profile` do `Header.tsx` a efekt pro načtení profilu z `supabase.from("member_profiles_public").select("full_name, avatar_url").eq("id", user.id).maybeSingle()`.
2. Na desktopu nahradit čistý `<Link to={ROUTES.DASHBOARD}><Button>Dashboard</Button></Link>` za `<DropdownMenu>` obsahující avatar, jméno a položky menu.
3. V mobilním menu přidat sekci nad/stávajícími tlačítky s avatarem, jménem a seznamem odkazů.
4. Přesměrování na profil použije `getMemberProfilePath(user.id)` z `src/lib/routes.ts`.
5. Zachovat přístupnost: odkazy a tlačítka s `aria-label`, dropdown ovladatelný klávesnicí.
6. Ověřit build a responsivitu.

## Co se nemění
- Barevné schéma, typografie a další vizuální styl zůstávají podle stávajících design tokenů.
- Struktura NAV_ITEMS a hlavní navigace klubu zůstává.
- Odhlášení nadále volá `signOut()` z `AuthContext`.
