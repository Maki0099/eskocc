

## Zabezpečení Realtime kanálů — notifications & event_subscriptions

### Problém

Tabulky `notifications` a `event_subscriptions` jsou publikovány do Supabase Realtime. Table-level RLS sice omezuje `SELECT` jen na vlastníka, ale **Realtime channel subscription** to neřeší — jakýkoli přihlášený uživatel se může přihlásit k libovolnému topicu (např. cizímu `user_id`) a odposlouchávat změny řádků v reálném čase, včetně obsahu cizích notifikací.

Aktuálně používaný kanál v `useNotifications.ts`:
```ts
supabase.channel('notifications-changes')
  .on('postgres_changes', { ... filter: `user_id=eq.${user.id}` }, ...)
```

Filter je jen klientský — server stejně pošle všechny změny, na které je kanál „napojen", a navíc Realtime broadcast topic není autorizován vůbec.

### Řešení — dvouvrstvá oprava

#### 1. RLS na `realtime.messages` (server-side authz pro topicy)

Přidat migraci s politikou, která dovolí `SELECT` na `realtime.messages` jen tehdy, když název topicu obsahuje `auth.uid()` přihlášeného uživatele:

```sql
-- Enable RLS on realtime.messages (already enabled by default, ensure it)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow users to subscribe ONLY to topics scoped to their own user_id
CREATE POLICY "Users can only subscribe to their own user-scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Topic must contain the authenticated user's UID
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);
```

> Pozn.: `realtime.topic()` je helper funkce, která vrací název topicu pro aktuální subscription. Pattern matching s `auth.uid()` zajistí, že se uživatel může přihlásit jen k topicu, který obsahuje jeho UUID.

#### 2. Klient — přejmenovat kanály na user-scoped topicy

Aby výše uvedené pravidlo fungovalo, musí mít každý kanál v názvu UUID uživatele:

**`src/hooks/useNotifications.ts`** (řádek ~63):
```ts
// PŘED:
const channel = supabase.channel('notifications-changes')

// PO:
const channel = supabase.channel(`notifications:${user.id}`)
```

**Ostatní real-time subscribery** — projít a opravit:
- `src/components/events/EventNotificationToggle.tsx` — pokud používá realtime (zkontrolovat, aktuálně dělá jen `select`/`insert`/`delete`, **realtime nepoužívá** → beze změny).
- Ostatní výskyty `supabase.channel(...)` v projektu — projdu při implementaci a každý kanál, který přenáší user-private data, dostane `user_id` v názvu.

### Co to vyřeší

- **Cizí uživatel se nemůže přihlásit k tvému notification kanálu** — `realtime.topic()` nebude obsahovat jeho UID, RLS pravidlo zablokuje.
- **Vlastní notifikace nadále chodí v reálném čase** — topic `notifications:<vlastní-uid>` projde RLS bez problému.
- **Žádný dopad na veřejné kanály** (kdyby v budoucnu vznikly broadcast/presence kanály bez user_id, dostanou samostatnou politiku).

### Co zůstává beze změny

- Table-level RLS na `notifications` a `event_subscriptions` — je správně, neřešíme.
- `event_subscriptions` aktuálně nemá realtime listener v UI, ale ochrana přes `realtime.messages` ho preventivně pokryje, kdyby vznikl.
- Push notifikace, edge funkce — beze změny.

### Soubory ke změně

- **Nová migrace** — `ALTER TABLE realtime.messages ENABLE RLS` + `CREATE POLICY` s `realtime.topic() LIKE '%' || auth.uid()::text || '%'`.
- **`src/hooks/useNotifications.ts`** — přejmenovat `'notifications-changes'` → `` `notifications:${user.id}` ``.
- **Audit ostatních `supabase.channel(...)` volání** — pokud najdu další user-scoped kanály bez UID v názvu, opravím stejným způsobem; dokončím při implementaci.

### Po nasazení

Security finding `notifications_realtime_no_channel_authz` označit jako vyřešený přes `manage_security_finding` → `mark_as_fixed`.

