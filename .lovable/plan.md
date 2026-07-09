## Problém

`HeroStatsLine` je v `HeroSection` načítán přes `React.lazy` + `Suspense` s `fallback={null}`. Dokud se komponenta nenačte a stats z `useClubStats()` nedorazí, na stránce **není žádný prostor rezervovaný** pro řádek „X km najezdil klub letos". Jakmile data dorazí, vloží se do DOM odstavec `text-3xl font-bold mb-6` a celý obsah pod ním (podnadpis, tlačítka) skočí dolů → viditelné poskakování.

Navíc má samotný `<p>` třídu `opacity-0 animate-fade-up animation-delay-300`, takže i po vložení do DOM chvíli není vidět, ale místo už zabírá — což je správně, ale platí to jen po tom, co se komponenta vůbec načte.

## Řešení

Rezervovat pevnou výšku slotu pro statistiku už v `HeroSection.tsx`, aby okolní obsah nikdy neposkakoval — bez ohledu na to, jestli `HeroStatsLine` vrátí obsah, `null`, nebo se ještě načítá.

### Změny v `src/components/home/HeroSection.tsx`

1. Obalit `<Suspense><HeroStatsLine /></Suspense>` do `<div>` s pevnou minimální výškou odpovídající řádku `text-3xl` + `mb-6` (přibližně `min-h-[72px]` na mobilu, `md:min-h-[80px]` na desktopu — odpovídá line-height 3xl + spodnímu marginu).
2. Suspense `fallback` nechat `null` — slot už drží výška wrapperu.

### Změny v `src/components/home/HeroStatsLine.tsx`

1. Odstranit brzký `return null` když `stats.ytd_km <= 0`, nebo ho ponechat — v obou případech vnější wrapper drží výšku, takže k posunu nedojde.
2. Ponechat `opacity-0 animate-fade-up` — animace se přehraje uvnitř již rezervovaného prostoru.

Volitelně: odstranit `mb-6` z `<p>` uvnitř `HeroStatsLine` a přesunout mezeru na wrapper, aby byl výpočet výšky konzistentní.

## Výsledek

Titulní stránka se při dohrání klubových statistik už nebude posouvat — číslo se objeví na místě, které je od začátku rezervované.
