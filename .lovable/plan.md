## Cíl

Zjistit, proč GitHub Actions běží zeleně, ale `www.eskocc.cz` pořád servíruje starou verzi, a opravit deploy bez použití `dangerous-clean-slate`.

## Nejpravděpodobnější příčina

Když jsou všechny runy zelené, chyba pravděpodobně není v buildu ani přihlášení, ale v jedné z těchto věcí:

1. Workflow nahrává do jiné FTP složky než té, kterou web používá.
2. FTP deploy akce kvůli sync-state souboru vyhodnocuje soubory jako beze změny.
3. Web/hosting má cache nebo servíruje jiný document root.
4. Secret `SFTP_TARGET` míří jinam, než si myslíme.

## Plán

### 1. Ověřit z logu posledního zeleného runu skutečný výsledek FTP kroku

V posledním runu otevřít krok:

```text
Deploy via FTP to Active24
```

Z něj potřebujeme zjistit hlavně:

```text
Server folder / server-dir
Uploaded / Updated / Deleted / Skipped counts
Local files count
```

Pokud log říká `uploaded: 0` nebo skoro všechno `skipped`, řešíme sync-state.
Pokud log ukazuje jinou server složku než document root, řešíme `SFTP_TARGET`.

### 2. Přidat jednoznačný deploy marker, který se mění při každém deployi

Workflow už vytváří:

```text
public/deploy-source.txt
```

Ten po buildu končí jako:

```text
dist/deploy-source.txt
```

Na webu musí být dostupný tady:

```text
https://www.eskocc.cz/deploy-source.txt
```

Pokud tam je starý obsah nebo 404, aktuální deploy nejde do reálného document rootu.

### 3. Porovnat FTP složky proti veřejnému webu

Na FTP zkontrolovat, kde leží aktuální `deploy-source.txt` a `index.html`:

```text
/
/www/
/web/
```

Potom otevřít v prohlížeči:

```text
https://www.eskocc.cz/deploy-source.txt
```

Výsledek rozhodne:

- Soubor je aktuální v `/`, ale web ho neukazuje → web neservíruje `/`.
- Soubor je aktuální ve `/www/`, ale ne v `/` → `SFTP_TARGET` má být `/www/`.
- Soubor není aktuální nikde → workflow reálně nic nenahrálo, i když doběhlo zeleně.

### 4. Opravit cílovou cestu nebo sync-state

Podle zjištění:

- Pokud je správný root `/www/`, změnit GitHub secret `SFTP_TARGET` na:

```text
/www/
```

- Pokud je správný root `/web/`, změnit GitHub secret `SFTP_TARGET` na:

```text
/web/
```

- Pokud je správný root `/`, nechat `SFTP_TARGET` jako `/` nebo ho odstranit.

Pokud je problém sync-state, ručně smazat jen tento soubor v cílové složce:

```text
.ftp-deploy-sync-state-active24.json
```

Ne mazat web, nepoužívat clean-slate.

### 5. Volitelně upravit workflow, aby diagnostika byla ještě průkaznější

Pokud bude potřeba úprava workflow, přidám bezpečný krok, který před FTP uploadem vypíše aktuální marker a donutí změnu jednoho malého souboru při každém deployi.

Zůstane bez:

```yaml
dangerous-clean-slate: true
```

## Co potřebuji od tebe teď

Pošli prosím screenshot nebo zkopírovaný text z posledního zeleného runu, konkrétně z kroku:

```text
Deploy via FTP to Active24
```

Stačí spodní část logu, kde jsou počty uploadnutých/skipped souborů a cílová server složka.