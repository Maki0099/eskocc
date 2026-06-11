## Diagnóza

Workflow je zelený, ale www stále ukazuje starou verzi. To dává dvě konkrétní možné příčiny:

1. **Špatná cílová cesta (`SFTP_TARGET`).** Active24 sdílený hosting má document root typicky `/www/` nebo `/httpdocs/`, nikoli `/`. Pokud secret `SFTP_TARGET` ukazuje do `/`, soubory se nahrávají do home složky FTP účtu, kterou web vůbec neservíruje. Starý workflow měl ale natvrdo `server-dir: /` a fungoval — to znamená, že FTP účet je pravděpodobně **chrootovaný přímo do document rootu**, takže `/` _je_ správně. Pak zbývá důvod 2.

2. **Sync-state cache v `FTP-Deploy-Action`.** Nový workflow používá:
   ```yaml
   state-name: .ftp-deploy-sync-state-active24.json
   ```
   Tato akce pak na FTP nahraje soubor `.ftp-deploy-sync-state-active24.json` se seznamem hashů a při každém dalším běhu nahrává **jen rozdíl**. Pokud byl state file vytvořen za situace, kdy uploadoval do jiné složky (nebo když pořád ještě běžel paralelně starý workflow s `dangerous-clean-slate`, který smazal i nahrané soubory hned po uploadu), akce si myslí, že má vše už nahrané, a fakticky **nic nepřenese** — log zelený, žádný „uploaded" záznam.

   Pravděpodobnost #2 je velmi vysoká, protože starý workflow měl `dangerous-clean-slate: true` (mazal celý obsah včetně předchozího state souboru) a běžel souběžně s novým.

## Plán opravy

### Krok 1 — Ověření v logu (nic se neupravuje)

Otevři poslední úspěšný run nového workflow → krok „Deploy via FTP to Active24" → rozbal log a najdi řádky typu:

- `connected to ...`
- `uploading ...` / `skipping ...`
- `published: X files`

Pokud uvidíš `0 files uploaded` nebo samé `skipping`, je to potvrzení teorie #2 (sync-state).

### Krok 2 — Vynutit plný re-deploy

Uprav `.github/workflows/deploy.yml` — krok „Deploy via FTP to Active24":

- Dočasně přidat `dangerous-clean-slate: true` **pro jeden běh**, aby se FTP vyčistil a všechno se nahrálo znovu.
- Po prvním úspěšném plném nasazení tento řádek opět odstranit (clean-slate je pomalý a riskantní — smaže i `documents/`, uploadované soubory atd. pokud nejsou v repu).

Alternativa bez clean-slate: smazat soubor `.ftp-deploy-sync-state-active24.json` přímo na FTP (přes FileZilla / web manager Active24), pak spustit workflow ručně (`workflow_dispatch`). Akce nenajde state → nahraje vše.

### Krok 3 — Diagnostický krok ve workflow (jednorázový)

Přidat před krok „Deploy via FTP" výpis obsahu `dist/`, aby bylo jisté, že build vůbec produkuje aktuální soubory:

```yaml
- name: Debug — list build output
  run: |
    ls -la dist/
    echo "--- index.html head ---"
    head -20 dist/index.html
```

Pokud `dist/index.html` v logu obsahuje aktuální hashe assetů, build je v pořádku a problém je 100 % v přenosu.

### Krok 4 — Stamp marker (volitelné, ale doporučené)

Vložit do buildu soubor `public/deploy-source.txt` s `${{ github.sha }}` a `$(date -u)`, aby šlo jediným GET requestem (`https://www.eskocc.cz/deploy-source.txt`) ověřit, jestli aktuální commit reálně dorazil na FTP. Toto byl plán z minulé iterace — i přes vypnutí starého repa zůstává užitečné pro budoucí debugging.

### Krok 5 — Ověření cesty (pokud krok 2 nepomůže)

Pokud po clean-slate stále stará verze:

- Přihlas se na FTP a zkontroluj, kde leží `index.html`, který web reálně servíruje (vlož do něj viditelný marker, otevři `www.eskocc.cz` a uvidíš).
- Porovnej s cestou, kam akce nahrává (z logu nebo z umístění `.ftp-deploy-sync-state-active24.json`).
- Pokud sedí jinam, nastav `SFTP_TARGET` secret na správnou cestu (např. `/www/`).

## Soubory ke změně

- `.github/workflows/deploy.yml` — přidat debug `ls` krok a jednorázově `dangerous-clean-slate: true`
- `public/deploy-source.txt` + drobná úprava workflow pro stamp (volitelné)

## Co tím získáš

- Jednoznačné rozlišení mezi „build nefunguje" vs. „upload nefunguje" vs. „upload jde jinam".
- Garantovaně čerstvé nasazení po prvním běhu s clean-slate.
- Trvalý nástroj (`/deploy-source.txt`) pro budoucí ověření, který commit reálně běží na produkci.
