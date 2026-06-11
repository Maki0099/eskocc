## Cíl

Odstranit `dangerous-clean-slate: true` z workflow a zajistit, aby se obsah z GitHub repa `Maki0099/eskocc` reálně přenášel na FTP `webftp.eskocc.cz`.

## Diagnóza

Workflow končí zeleně, ale na FTP nic nepřibývá. To znamená jednu z těchto věcí:

1. **Sync-state cache** — `FTP-Deploy-Action` si vede soubor `.ftp-deploy-sync-state-active24.json` se seznamem hashů. Pokud je zastaralý/nesedí s realitou, akce „skipne" všechno a nahraje 0 souborů.
2. **Špatná cílová cesta** (`SFTP_TARGET` secret) — soubory se nahrávají do home složky FTP účtu, kterou web neservíruje, ne do document rootu.
3. **Špatné přihlašovací údaje / jiný FTP účet** — workflow se připojí někam jinam, než kam se díváš přes `webftp.eskocc.cz`.

Bez clean-slate je třeba problém vyřešit jinak — manuálním smazáním state souboru a verifikací cílové cesty.

## Plán

### Krok 1 — Upravit `.github/workflows/deploy.yml`

- Odstranit řádek `dangerous-clean-slate: true`.
- Ponechat diagnostické kroky (stamp marker `deploy-source.txt` + `ls -la dist/`) — pomohou potvrdit, že build je v pořádku.
- Přidat do log_level `verbose` u `FTP-Deploy-Action`, aby log ukazoval reálné `connected to ...`, cílovou cestu a počet `uploaded/skipped` souborů.

### Krok 2 — Manuálně smazat sync-state na FTP (uděláš ty)

Přes `webftp.eskocc.cz` najít a smazat soubor:

```
.ftp-deploy-sync-state-active24.json
```

Hledej ho v rootu FTP účtu i v document rootu (typicky `/www/` nebo `/httpdocs/`). Smazáním donutíš akci považovat FTP za prázdný a nahrát vše znovu — bez clean-slate, bez mazání čehokoli jiného.

### Krok 3 — Ověřit cílovou cestu (uděláš ty)

Ve `webftp.eskocc.cz` zjisti, ve které složce leží reálný `index.html`, který servíruje `www.eskocc.cz`:

- Pokud je v rootu připojení → `SFTP_TARGET` má být `/` (nebo nenastaveno).
- Pokud je ve `/www/` → `SFTP_TARGET` musí být `/www/`.
- Pokud je ve `/httpdocs/` → `SFTP_TARGET` musí být `/httpdocs/`.

Pošli mi cestu, kterou tam vidíš, a já ti řeknu, jestli secret sedí (nebo upravíš sám v GitHub → Settings → Secrets).

### Krok 4 — Spustit workflow ručně

GitHub → Actions → „Deploy to Active24" → **Run workflow** → main.

V logu kroku „Deploy via FTP to Active24" hledej:

- `Connected to <host>` — musí sedět s `webftp.eskocc.cz` (případně jeho IP).
- `Server folder: <path>` — musí být document root.
- `published: N files` — N musí být > 0 (poprvé ~stovky).

### Krok 5 — Ověřit na webu

Otevři v inkognito:

```
https://www.eskocc.cz/deploy-source.txt
```

Musí ukázat `source: NEW-REPO` + aktuální commit hash. Pokud ano → deploy funguje, hotovo.

## Soubory ke změně

- `.github/workflows/deploy.yml` — odstranit `dangerous-clean-slate: true`, přidat `log-level: verbose`.

## Co potřebuju od tebe paralelně

1. Smazat na FTP `.ftp-deploy-sync-state-active24.json` (pokud existuje).
2. Zjistit, ve které složce na FTP leží `index.html` servírovaný `www.eskocc.cz`, a poslat mi cestu.
3. Potvrdit, že FTP účet v secretu `SFTP_USER` je tentýž, jakým se přihlašuješ do `webftp.eskocc.cz` (pokud ne, máš workflow napojený na úplně jiný účet a deploy končí jinde).
