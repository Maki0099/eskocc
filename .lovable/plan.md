Upravím `.github/workflows/deploy.yml` tak, aby odstranil pravděpodobnou příčinu chyby `FTPError: 550 assets: No such file or directory` a zároveň ošetřil varování k Node.js.

Plán:
1. Odstranit `dangerous-clean-slate: true`
   - Aktuálně je ve workflow stále zapnuté.
   - To může při mazání/synchronizaci vzdálené složky narazit na neexistující adresář `assets` a deploy spadne.

2. Použít cílovou složku a port ze secretů
   - `port: ${{ secrets.SFTP_PORT || 21 }}`
   - `server-dir: ${{ secrets.SFTP_TARGET || '/' }}`
   - Tím bude možné nastavit správný Active24 webroot bez další změny workflow.
   - Důležité: `SFTP_TARGET` by měl být adresář, kde má po deploy ležet `index.html`, typicky například `/www/`, pokud ho Active24 používá.

3. Resetovat FTP deploy sync stav
   - Přidat nový `state-name`, například `.ftp-deploy-sync-state-active24.json`.
   - Pokud na serveru zůstal starý/rozbitý sync stav po předchozích pokusech, akce ho nebude používat.

4. Ošetřit Node.js 20 deprecation warning
   - Přepnout build runtime z `node-version: 20` na novější verzi.
   - Přidat `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`, aby GitHub Actions běžely už teď v režimu kompatibilním s nadcházející změnou.
   - Samotné varování není příčinou chyby `550 assets`, ale je dobré ho vyřešit při stejné úpravě.

Technická poznámka:
- Nevracel bych `v4.3.7`, protože ta verze FTP akce neexistuje / nejde resolve-nout.
- `SamKirkland/FTP-Deploy-Action@v4.3.6` necháme, pokud deploy po úpravě projde.