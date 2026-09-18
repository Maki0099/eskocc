# Výzva „Propojit Stravu" u všech nepropojených členů

## Proč to teď nevidíš
Máš Stravu propojenou, takže se ti u tvého řádku výzva záměrně nezobrazuje. U ostatních členů je dnes jen pasivní štítek „Nepropojená Strava", na který nejde kliknout.

## Co se změní
Ve statistikách bude u každého nepropojeného člena klikací prvek:

- U tvého vlastního řádku: **Propojit Stravu** → otevře nastavení účtu, kde se propojení provádí.
- U ostatních členů: **Nepropojená Strava — jak propojit?** → otevře krátké okno s návodem (3 kroky: přihlásit se, otevřít nastavení účtu, kliknout na Propojit Stravu) a upozorněním, že propojení si musí provést daný člen sám ze svého účtu.

Vzhled zůstává stejný (jantarová barva, ikona), jen přibude podtržení při najetí myší, aby bylo zřejmé, že jde o odkaz.

## Technická poznámka
Úprava jen v `src/pages/Statistics.tsx`: štítek u cizích členů se změní na `button` s `e.stopPropagation()` (leží uvnitř odkazu na profil, proto ne vnořený `Link`), otevírající sdílený `Dialog` s návodem. Žádné změny v databázi ani v backendu.
