# Dočasný přístup pro hosty (odkaz s platností)

## Co to umí
- Admin v Administraci (nová záložka „Hostovské přístupy") vytvoří odkaz: zadá popis (např. „Petr – soustředění"), platnost (datum a čas do kdy, nebo rychlá volba 1 den / 7 dní / 30 dní).
- Admin dostane odkaz `eskocc.cz/host/<kód>`, zkopíruje nebo sdílí ho.
- Host otevře odkaz a bez registrace je hned uvnitř – vidí vše jako člen (Statistiky, Mapa klubu, Mallorca, Vyjížďky, Galerie), ale jen pro čtení: nemůže se přihlašovat na vyjížďky, nahrávat fotky, propojovat Stravu ani nic upravovat.
- Nahoře se hostovi zobrazí pruh „Hostovský přístup do 20. 10. 2026" .
- Po vypršení (nebo když admin odkaz zruší) se host automaticky odhlásí a uvidí hlášku, že přístup skončil.
- V seznamu admin vidí: popis, platnost, kolikrát byl odkaz otevřen, poslední použití, tlačítka Kopírovat / Prodloužit / Zrušit.

## Bezpečnost
- Kód odkazu je dlouhý náhodný řetězec, neuhádnutelný.
- Kdo odkaz má, ten vstoupí – proto doporučujeme krátkou platnost.
- Host nikdy nevidí e-maily, telefony ani data narození členů (platí stejná pravidla jako dnes).

## Technické detaily
- Nová role `guest` v `app_role` a tabulka `guest_access_links` (token, label, expires_at, revoked_at, use_count, last_used_at, created_by, guest_user_id). RLS: jen admin (has_role) čte/zapisuje; GRANT pro authenticated + service_role.
- Edge funkce `redeem-guest-link` (verify_jwt=false): ověří token a platnost, vytvoří/použije technického uživatele hosta (service role, email `guest-<id>@guest.eskocc.cz`, role `guest`), vrátí session (admin generateLink/magic link token → klient `verifyOtp`). Zapíše use_count/last_used_at.
- Čtecí RLS politiky a RPC funkce, které dnes kontrolují member/active_member/admin, rozšířit o `guest` u SELECT/čtení; zápisové politiky beze změny (host nic nezapíše).
- `useUserRole`: `isGuest`, `isMember` zahrne hosta pro zobrazení; akční tlačítka (účast, upload, Strava, tvorba tras) skrytá pro `isGuest`.
- Nová stránka `/host/:token`, banner v Header s datem vypršení; při každém načtení klient ověří platnost (RPC `get_guest_access_status`) a po vypršení provede signOut.
- Cron/denní úklid: smazání technických hostů s vypršelým přístupem.
- Admin UI: `GuestAccessAdmin` v Admin.tsx.
