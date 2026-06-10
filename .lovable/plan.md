## Problém

Edge funkce `user-strava-callback` přesměrovává po OAuth na `/ucet`, ale v aplikaci je routa registrovaná jako `/account` (viz `src/lib/routes.ts` → `ACCOUNT: '/account'`). Proto vrací 404.

## Oprava

V `supabase/functions/user-strava-callback/index.ts` nahradit všech 6 výskytů `/ucet` za `/account`:

- `/ucet?strava=error&reason=...` (5×)
- `/ucet?strava=connected` (1×)

## Ověření po nasazení

Kliknout v `/account` na "Propojit Strava", projít OAuth flow a potvrdit, že se vrátí na `/account?strava=connected` bez 404.

## Volitelná konzistence

Nahradit hardcoded stringy konstantou (např. `/account`) nebo importem `ROUTES.ACCOUNT` — pro edge funkci to ale nemá smysl (jiný runtime), takže stačí prostá náhrada.
