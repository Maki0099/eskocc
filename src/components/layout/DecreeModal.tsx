import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
    <div className="flex flex-col gap-3">
      <span className="text-sm text-muted-foreground">Dokumenty klubu</span>
      <div className="flex gap-3">
        {documents.map((doc) => (
          <Dialog key={doc.id} open={selectedDoc?.id === doc.id} onOpenChange={(open) => setSelectedDoc(open ? doc : null)}>
            <DialogTrigger asChild>
              <button className="group flex flex-col items-center gap-1 text-center">
                <div className="relative w-14 h-18 rounded overflow-hidden border border-border/50 group-hover:border-primary/50 transition-colors">
                  <img 
                    src={doc.image} 
                    alt={doc.title} 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors max-w-16 truncate">
                  {doc.year}
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-4 border-0 bg-transparent shadow-none">
              <VisuallyHidden>
                <DialogTitle>{doc.title} - {doc.year}</DialogTitle>
              </VisuallyHidden>
              <img 
                src={doc.image} 
                alt={`${doc.title} - ${doc.year}`} 
                className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg"
              />
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
};

export default DecreeModal;
