import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TermsAndConditionsProps {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
}

const TermsAndConditions = ({ accepted, onAcceptedChange }: TermsAndConditionsProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Podmínky členství</h2>
      <p className="text-sm text-muted-foreground">
        Pro dokončení registrace si prosím přečti a odsouhlasí podmínky členství v klubu.{" "}
        <a 
          href="/documents/podminky-registrace-clenstvi.pdf" 
          download="podminky-registrace-clenstvi.pdf"
          className="text-primary hover:underline"
        >
          Stáhnout PDF
        </a>
      </p>
      
      <ScrollArea className="h-64 rounded-xl border border-border bg-muted/30 p-4">
        <div className="space-y-4 text-sm text-muted-foreground pr-4">
          <h3 className="font-semibold text-foreground">
            Podmínky registrace a členství v cyklistickém klubu esko.cc
          </h3>
          <p>
            Tímto dokumentem stanovujeme pravidla potřebná pro vstup a fungování v našem 
            valašském cyklistickém klubu esko.cc. Registrací potvrzuješ, že jsi se s podmínkami 
            seznámil/a a souhlasíš s nimi.
          </p>

          <div>
            <h4 className="font-medium text-foreground mb-2">1. Charakter klubu</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>esko.cc je uzavřený cyklistický klub, který sdružuje aktivní cyklisty se silniční i horskou specializací.</li>
              <li>Klub má vysoké sportovní ambice a opírá se o týmového ducha Cyklistických mušketýrů.</li>
              <li>Nové členství podléhá individuálnímu schválení správní radou klubu.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">2. Podmínky členství</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Podmínkou vstupu je souhlas s těmito pravidly a úspěšné schválení žádosti správní radou.</li>
              <li>Člen je motivován účastnit se společných aktivit, tréninků a schůzí, pokud mu to jeho možnosti dovolují.</li>
              <li>Členství je „povinně dobrovolné" ve výši: 500 Kč/rok pro dospělé, 200 Kč/rok pro studenty.</li>
              <li>Klub uznává jízdy na silničním i horském kole.</li>
              <li>Elektrokola jsou pro účely klubové statistiky a soutěží povolena na trasách nad 55 km.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">3. Příspěvek za projeté kilometry</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Každý člen přispívá do klubové sbírky částkou 1 Kč za každý členem ujetý kilometr.</li>
              <li>Vybrané prostředky jsou každoročně využity na podporu a rozvoj mládežnického sportu v údolí Vsetínské Bečvy.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">4. Osobní údaje a jejich zpracování</h4>
            <p className="mb-2">
              Registrací uděluješ klubu souhlas se zpracováním osobních údajů v rozsahu:
              jméno, příjmení, emailová adresa, věk, telefon (pokud je uveden), informace o sportovní aktivitě a ujetých kilometrech.
            </p>
            <p className="font-medium mb-1">Účely zpracování:</p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>vedení členské evidence,</li>
              <li>komunikace se členy,</li>
              <li>vyhodnocování sportovních aktivit a statistik,</li>
              <li>administrace členských příspěvků a sbírky,</li>
              <li>plnění zákonných povinností vyplývajících z činnosti spolku.</li>
            </ul>
            <p className="font-medium mb-1">Další podmínky:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Osobní údaje budou uchovávány pouze po dobu trvání členství a následně po nezbytnou dobu dle zákona.</li>
              <li>Klub nepředává osobní údaje třetím stranám, s výjimkou situací stanovených právními předpisy.</li>
              <li>Každý člen má právo požádat o přístup ke svým údajům, jejich úpravu nebo výmaz, pokud to neodporuje zákonným povinnostem klubu.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">5. Závěrečná ustanovení</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Registrací potvrzuješ, že všechny poskytnuté údaje jsou pravdivé.</li>
              <li>Souhlasíš s dodržováním klubových pravidel a podporou klubového ducha.</li>
              <li>Správní rada si vyhrazuje právo podmínky členství aktualizovat – členové budou o změnách vždy informováni.</li>
            </ul>
          </div>
        </div>
      </ScrollArea>

      <div className="flex items-start gap-3 pt-2">
        <Checkbox
          id="terms"
          checked={accepted}
          onCheckedChange={(checked) => onAcceptedChange(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
          Souhlasím s podmínkami členství v klubu esko.cc a potvrzuji, že jsem se s nimi seznámil/a.
        </Label>
      </div>
    </div>
  );
};

export default TermsAndConditions;
