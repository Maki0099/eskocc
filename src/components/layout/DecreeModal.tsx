import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import decreeOriginal from "@/assets/decree/ustanovujici-dekret-original.jpg";
import decree2025 from "@/assets/decree/ustanovujici-dekret-2025.jpg";

interface DocumentItem {
  id: string;
  title: string;
  image: string;
  year: string;
}

const documents: DocumentItem[] = [
  {
    id: "original",
    title: "Ustanovující dekret",
    image: decreeOriginal,
    year: "2025 - originál",
  },
  {
    id: "2025",
    title: "Ustanovující dekret",
    image: decree2025,
    year: "2025 - kopie",
  },
];

const DecreeModal = () => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="text-sm text-muted-foreground">Dokumenty klubu</span>
        <div className="flex gap-3">
          {documents.map((doc) => (
            <Dialog key={doc.id} open={selectedDoc?.id === doc.id} onOpenChange={(open) => setSelectedDoc(open ? doc : null)}>
              <DialogTrigger asChild>
                <button className="group flex flex-col items-center gap-1 text-center">
                  <div className="relative w-14 h-18 rounded overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-200">
                    <img 
                      src={doc.image} 
                      alt={doc.title} 
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors max-w-16 truncate">
                    {doc.year}
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 bg-background border-border overflow-hidden">
                <div className="relative w-full h-full">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-secondary transition-colors"
                    aria-label="Zavřít"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <ScrollArea className="h-[90vh] w-full">
                    <div className="p-4 flex justify-center">
                      <img 
                        src={doc.image} 
                        alt={`${doc.title} - ${doc.year}`} 
                        className="w-full max-w-3xl object-contain rounded-lg shadow-xl"
                      />
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    </>
  );
};

export default DecreeModal;
