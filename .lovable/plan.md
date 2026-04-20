

## Reset hesla – odkaz vede na 404 / „Email link is invalid or has expired"

### Co se reálně děje (z auth logů)
```
GET /verify  →  403  "One-time token not found"
referer: https://www.eskocc.cz/reset-password
```

Toto **není** 404 z React Routeru — je to chyba ze Supabase `/verify` endpointu. Supabase odkazy pro reset hesla fungují tak, že email obsahuje URL ve tvaru:

```
https://<project>.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=<vaše-stránka>
```

Supabase token ověří, vymění ho za session a teprve pak přesměruje na `redirect_to`. Chyba „One-time token not found" znamená jednu ze tří věcí:

1. **Email security scanner odkaz prokliknul jako první** (Microsoft Defender, Proofpoint, Outlook Safe Links atd.) — token je jednorázový, takže když ho otevře skener kvůli kontrole, uživatel pak dostane 403.
2. **Odkaz vypršel** — výchozí TTL je 1 hodina a začíná běžet okamžikem odeslání.
3. **`redirect_to` doména není ve whitelistu** Supabase Auth (Site URL + Additional Redirect URLs), takže Supabase odkaz odmítne.

V kódu vše vypadá správně:
- `Login.tsx` ř. 160: `redirectTo: ${window.location.origin}${ROUTES.RESET_PASSWORD}` ✓
- Route `/reset-password` v `App.tsx` existuje a je veřejná ✓
- `ResetPassword.tsx` poslouchá `PASSWORD_RECOVERY` event a volá `updateUser({ password })` ✓

Žádné vlastní auth email šablony nejsou — používá se výchozí Lovable/Supabase email.

---

### Plán řešení (3 nezávislé vrstvy, doporučuji udělat všechny)

#### 1. Ověřit a doplnit Auth Redirect URLs (nejčastější příčina)
V Supabase Auth Settings musí být:
- **Site URL**: `https://www.eskocc.cz`
- **Additional Redirect URLs** (každá zvlášť):
  - `https://www.eskocc.cz/**`
  - `https://eskocc.cz/**`
  - `https://eskocc.lovable.app/**`
  - `https://id-preview--a7252d34-9091-4957-bfd7-9e5b5f02c1aa.lovable.app/**`
  - `http://localhost:5173/**` (pro dev)

Pokud chybí `https://www.eskocc.cz/**`, Supabase odkaz odmítne i s validním tokenem.

→ Po přepnutí do default modu otevřu **Cloud → Users → Auth Settings** a doplním URLs (případně odkážu uživatele, ať to udělá sám).

#### 2. Nasadit vlastní šablonu reset emailu s explicitním varováním + použít token-based flow
Místo magic linku přejít na **6-místný OTP kód v emailu + zadání kódu na stránce**. Tím se obchází problém s email scannery, protože není co prokliknout. Implementačně:
- `scaffold_auth_email_templates` → vytvoří šablony pro 6 typů auth emailů včetně `recovery.tsx`
- Recovery šablona zobrazí jak **odkaz**, tak i **OTP kód** (`{{ .Token }}`)
- `ResetPassword.tsx` rozšířit o variantu „Mám kód z emailu" → input pro kód + email → `supabase.auth.verifyOtp({ email, token, type: 'recovery' })` → po úspěchu zobrazit form pro nové heslo
- Branding šablon na klubové barvy (#B7A99A primary, kulaté logo, Inter font, bílé pozadí)
- Deploy `auth-email-hook`

Bonus: emaily půjdou z `notify.eskocc.cz` (pokud je email domain nastavená), což výrazně zlepší doručitelnost a zabrání tomu, aby spam filtry „přebraly" odkaz.

#### 3. Drobné UX vylepšení v `ResetPassword.tsx`
- Když je v URL hashi `error=access_denied&error_code=otp_expired`, místo redirectu na `/login` zobrazit jasnou hlášku „Tvůj odkaz vypršel nebo už byl použit. Požádej o nový." s tlačítkem zpět na forgot-password formulář.
- Aktuálně se při neplatném odkazu uživatel přesměruje na `/login` s toastem — ale toast často zmizí dřív, než si ho stihne přečíst.

---

### Co potřebuji od tebe rozhodnout

**Otázka A — Redirect URLs**: Mám ti otevřít Auth Settings, ať doplníš URLs ručně, nebo to mám zkusit doplnit přes nástroje Lovable Cloud automaticky?

**Otázka B — Email s OTP kódem**: Chceš, abych nasadil vlastní brandované auth email šablony s OTP kódem (řeší 95 % případů „odkaz neplatí"), nebo zatím jen opravíme redirect URLs a počkáme, jestli to stačí?

### Soubory, které se případně změní
- `src/pages/ResetPassword.tsx` — lepší error handling + volitelně OTP varianta
- `supabase/functions/auth-email-hook/index.ts` (nový) — auth email hook
- `supabase/functions/_shared/email-templates/recovery.tsx` (nový) — brandovaná šablona
- `supabase/functions/_shared/email-templates/*` (5 dalších, jeden balík)
- Žádné DB migrace nejsou potřeba.

