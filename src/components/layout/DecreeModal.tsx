import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { X } from "lucide-react";
import decreeImage from "@/assets/decree/ustanovujici-dekret-2025.jpg";

const DecreeModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="group flex flex-col items-start gap-2 text-left">
          <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Ustanovující dekret
          </span>
          <div className="relative w-16 h-20 rounded overflow-hidden border border-border/50 shadow-sm group-hover:shadow-md group-hover:border-border transition-all duration-200">
            <img 
              src={decreeImage} 
              alt="Ustanovující dekret ESKO.cc" 
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 bg-background border-border overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-secondary transition-colors"
            aria-label="Zavřít"
          >
            <X className="h-5 w-5" />
          </button>
          <img 
            src={decreeImage} 
            alt="Ustanovující dekret cyklistického klubu ESKO.cc" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DecreeModal;
