import { FileText, Download, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import decreeOriginal from "@/assets/decree/ustanovujici-dekret-original.jpg";
import decree2025 from "@/assets/decree/ustanovujici-dekret-2025.jpg";

interface Document {
  id: string;
  title: string;
  description: string;
  type: "pdf" | "image";
  url?: string;
  images?: { src: string; label: string }[];
}

const documents: Document[] = [
  {
    id: "podminky",
    title: "Podmínky registrace a členství",
    description: "Kompletní pravidla pro vstup a fungování v cyklistickém klubu esko.cc včetně členských příspěvků a zpracování osobních údajů.",
    type: "pdf",
    url: "/documents/podminky-registrace-clenstvi.pdf"
  },
  {
    id: "dekret",
    title: "Ustanovující dekret",
    description: "Oficiální zakládající dokument cyklistického klubu esko.cc.",
    type: "image",
    images: [
      { src: decreeOriginal, label: "Originál 2025" },
      { src: decree2025, label: "Kopie 2025" }
    ]
  }
];

const Documents = () => {
  const [selectedImage, setSelectedImage] = useState<{ src: string; label: string } | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Klubové dokumenty
              </h1>
              <p className="text-muted-foreground text-lg">
                Oficiální dokumenty cyklistického klubu esko.cc
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {documents.map((doc) => (
                <Card key={doc.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {doc.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-3">
                      {doc.type === "pdf" && doc.url && (
                        <Button asChild variant="outline" size="sm">
                          <a href={doc.url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Stáhnout PDF
                          </a>
                        </Button>
                      )}
                      {doc.type === "image" && doc.images?.map((img) => (
                        <Button 
                          key={img.label}
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedImage(img)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {img.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-4 border-0 bg-transparent shadow-none">
          <VisuallyHidden>
            <DialogTitle>{selectedImage?.label}</DialogTitle>
          </VisuallyHidden>
          {selectedImage && (
            <img 
              src={selectedImage.src} 
              alt={selectedImage.label} 
              className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
