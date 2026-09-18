# Oprava prázdné Mapy klubu

## Zjištěná příčina
Mapa, 59 bodů jízd i všechny mapové podklady se načítají úspěšně. Prohlížeč ale vykresluje vlastní mapový prvek s výškou **0 px**, protože styly mapové knihovny přepisují absolutní umístění kontejneru. Proto je rámeček prázdný.

## Úprava
- Nastavit mapovému prvku pevnou šířku a výšku podle jeho rodičovského rámečku místo spoléhání na absolutní umístění.
- Po vytvoření a po změně velikosti stránky zavolat přepočet mapy, aby se správně vykreslila také v PWA a na mobilu.
- Zachovat současné body jízd, přepínač období i odkaz „Zpět na statistiky“.

## Ověření
- Otevřít `/mapa-klubu` jako přihlášený člen a potvrdit nenulovou výšku mapy, viditelný podklad a značky jízd.
- Zkontrolovat stránku na počítači i v mobilní šířce a ověřit návrat na statistiky.
