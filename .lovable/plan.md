
Uživatel se ptá na dvě věci ohledně sync-club-activities:
1. Jestli se uloží i víc než 200 aktivit (současný kód má `for (let page = 1; page <= 1; page++)` — což je hard-coded JEDNA stránka, takže max 200).
2. Jak často sync běží.

Z kódu vím:
- `sync-club-activities/index.ts` má smyčku omezenou na page≤1 → **maximálně 200 aktivit, vyšší stránky se ignorují**.
- Strava Club Activities API navíc má dokumentovaný limit ~200 nejnovějších aktivit klubu (nelze stránkovat hluboko do historie).
- Frekvence: musím ověřit cron job v DB.

Ověřím cron schedule a pak navrhnu úpravu.
