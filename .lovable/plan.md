

## Vyčistit matoucí stav „Token expiruje" v admin panelu Strava klub

### Diagnóza
Propojení **funguje správně**. Sync proběhl dnes ve 14:03 lokál (82 aktivit, status success), `needs_reauth = false`, žádná chyba. Hodnota „Token expiruje 21. 4. 2026 20:03" v UI je jen **6hodinová expirace short-lived access tokenu**, který se automaticky refreshne při každém syncu (cron každé 4h + manuální tlačítko). Není to deadline pro re-autorizaci.

### Změny v UI (`src/components/admin/ClubStravaAdmin.tsx`)

**1. Nahradit zavádějící „Token expiruje X" jasnějším textem o stavu**
Místo:
> Athlete ID: 1344015 · Token expiruje 21. 4. 2026 20:03

Zobrazit:
> Athlete ID: 1344015 · Poslední úspěšný sync: před 2 hodinami (82 aktivit) · Auto-refresh ✓

Tím se admin dozví **to, co ho reálně zajímá** (sync funguje), místo technického detailu o krátkodobém access tokenu.

**2. Odstranit „Strava token vypršel" alert z `showStaleAlert`**
Aktuální logika `tokenExpired = creds.expires_at < Date.now()` zobrazí strašidelný červený alert pokaždé, když uplyne 6 hodin od posledního syncu (což je normální stav před dalším cronem). Odstranit `tokenExpired` z podmínky alertu — spoléhat **pouze** na:
- `needs_reauth === true` (skutečný problém — refresh token byl odvolán)
- `lastSyncAt` starší než 24h (cron neběží)

**3. Drobný „token health" indikátor (volitelné, decentní)**
Pod info o athlete ID zobrazit malý šedý badge:
- Zelený `Aktivní` pokud `needs_reauth = false` a sync ≤ 24h
- Žlutý `Sync zastaralý` pokud sync > 24h, ale refresh token OK
- Červený `Vyžaduje přepojení` pokud `needs_reauth = true`

### Soubory
- `src/components/admin/ClubStravaAdmin.tsx` — text propojeného stavu (řádky 346–361), `showStaleAlert` logika (řádky 264–269, 300–333)

### Co se NEmění
- Edge funkce `sync-club-activities` — refresh logika je správná, nic neopravuju.
- DB schema, cron, OAuth flow.

