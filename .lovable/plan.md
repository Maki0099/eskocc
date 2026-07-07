Normalizovat jména a příjmení všech členů v profilu tak, aby každé slovo v `full_name` začínalo velkým písmenem, a zajistit, že se toto pravidlo uplatní i při budoucí registraci a editaci profilu.

Kroky:

1. **Jednorázová oprava existujících dat**
   - Spustit SQL `UPDATE` nad tabulkou `profiles`, který pro každé slovo v `full_name` nastaví první písmeno velké (např. PostgreSQL `initcap()` nebo ekvivalentní funkce zachovávající diakritiku).
   - Předem zobrazit náhled změn (`SELECT id, full_name, initcap(full_name)`) pro kontrolu.

2. **Automatická normalizace při ukládání**
   - Vytvořit BEFORE INSERT/UPDATE trigger na `profiles`, který pro sloupec `full_name` aplikuje stejnou normalizaci (`initcap` / vlastní funkce) pokud není NULL/empty.
   - Trigger zachová existující diakritiku a velká písmena uprostřed slov (např. `McDonald`) nechá nedotčená, pokud je to žádoucí; pro česká jména stačí standardní `initcap`.

3. **Frontend – registrace a účet**
   - Před odesláním z registračního formuláře a z editace účtu normalizovat `fullName` pomocí stejné funkce jako na backendu (např. `toTitleCase(fullName)` v `src/lib/utils.ts` nebo inline), aby se uživateli zobrazovalo upravené jméno ještě před uložením.
   - Případně rovnou využít utilitku v `handleSave` v `src/pages/Account.tsx` a v `handleSubmit` v `src/pages/Register.tsx`.

4. **Ověření**
   - Spustit build a zkontrolovat, že se změna projeví ve statistikách i exportu.
   - Otestovat registraci/editaci, že jméno se uloží správně kapitálkované.

Soubory/akce:
- SQL migrace: aktualizace `profiles.full_name` + trigger
- `src/lib/utils.ts`: přidat `toTitleCase()` utilitu
- `src/pages/Register.tsx`: normalizovat `fullName` před `signUp`
- `src/pages/Account.tsx`: normalizovat `fullName` před `update`
- `src/pages/Statistics.tsx` už zobrazuje `full_name`, takže se efekt projeví automaticky