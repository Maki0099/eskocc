# Sdílení profilu a jízd i mimo klub

Člen si sám vytvoří veřejný odkaz — buď na svůj profil, nebo na jednu konkrétní jízdu. Odkaz funguje pro kohokoli bez přihlášení, dokud ho člen nezruší.

## Jak to bude fungovat

**Vytvoření odkazu**
- Na vlastním profilu přibude tlačítko „Sdílet profil“. Vytvoří odkaz typu `/s/<náhodný-kód>`.
- U každé jízdy v sekci Trasy (a v detailu jízdy) přibude „Sdílet jízdu“ se stejným principem: `/s/<náhodný-kód>`.
- Kód je dlouhý a náhodný, takže odkaz nejde uhodnout.

**Správa odkazů**
- V nastavení účtu bude seznam „Sdílené odkazy“: co je sdílené, kdy vytvořeno, kolikrát otevřeno, tlačítko Zkopírovat a Zrušit.
- Zrušený odkaz okamžitě přestane fungovat (návštěvník uvidí stránku „Odkaz už neplatí“).

**Co uvidí návštěvník bez účtu**
- Sdílená jízda: název, datum, jméno člena, mapa trasy, vzdálenost, převýšení, čas, průměrná rychlost + tlačítko Stáhnout GPX a návod pro Garmin.
- Sdílený profil: jméno, přezdívka, foto, souhrn sezony (km, převýšení, počet jízd), seznam venkovních jízd s mapkami; kliknutí na jízdu otevře její detail v rámci téhož odkazu, GPX lze stáhnout.
- Nikdy se nezobrazí e-mail, telefon, datum narození ani odznaky s osobními údaji.

**Volba rozsahu dat**
- Při vytváření odkazu si člen přepínačem zvolí, zda zveřejnit i tep a výkon (watty). Výchozí stav: vypnuto.
- Volbu lze u existujícího odkazu kdykoli změnit.

**Drobnosti**
- Stránka odkazu má vlastní náhled pro sociální sítě (jméno + km + převýšení) a jde sdílet přes systémové sdílení v mobilu.
- Odkaz se nepřidává do vyhledávačů (noindex).
- V hlavičce sdílené stránky bude nenápadná výzva „Chceš jezdit s námi? ESKO.cc“ vedoucí na web klubu.

## Technická část

- Nová tabulka `public.share_links`: `id`, `token` (unikátní), `owner_id`, `kind` (`profile` | `activity`), `activity_id` (nullable), `include_biometrics` (bool, default false), `revoked_at`, `view_count`, `created_at`, `updated_at`. GRANT pro `authenticated` (správa vlastních přes `owner_id = auth.uid()`) a `service_role`; RLS bez přístupu pro `anon`.
- Čtení veřejných dat přes SECURITY DEFINER funkce volané rolí `anon`:
  - `get_shared_payload(_token text)` — ověří platnost (nezrušený odkaz), vrátí typ a základní info o vlastníkovi.
  - `get_shared_activity(_token text)` a `get_shared_activities(_token text, _limit, _offset)` — vrací jen venkovní cyklistické jízdy s `map_polyline`, `excluded_as_duplicate = false`, `is_trainer = false`; tep/watty jen když `include_biometrics`.
  - Inkrement `view_count` přes samostatnou definer funkci.
- Nová veřejná stránka `/s/:token` (`src/pages/SharedView.tsx`) mimo `ProtectedRoute`, přidá se do `ROUTES`/`ROUTE_PATTERNS` a `App.tsx`. Znovu použije `RouteDetailDialog` a mapové náhledy z `MemberRoutes`, ale s daty ze sdílených RPC.
- Komponenta `ShareLinkDialog` (vytvoření/kopírování/přepínač biometrie) použitá na `MemberProfile.tsx` (jen pro vlastníka) a u položek tras; sekce správy odkazů na `Account.tsx`.
- `Seo` komponenta na sdílené stránce: `noindex`, OG titulek a popis z dat jízdy/profilu.
