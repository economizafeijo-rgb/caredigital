import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { QrCode } from "./QrCode";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { QrVariant } from "@/lib/qr-data";

/** QR pequeno no rodapé. Ao tocar, abre em tamanho grande para leitura pela câmera do celular. */
export function QrEnlarge({
  variant,
  thumb = 44,
  big = 280,
  label,
}: {
  variant: QrVariant;
  thumb?: number;
  big?: number;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar QR Code: ${label}`}
        className="group relative block rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <QrCode variant={variant} size={thumb} />
        <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-foreground text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 size={9} aria-hidden="true" />
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="grid w-auto place-items-center gap-4 bg-white p-6 sm:max-w-none">
          <DialogTitle className="text-base font-bold text-foreground">{label}</DialogTitle>
          <DialogDescription className="sr-only">
            Aponte a câmera do celular para o código para abrir o site.
          </DialogDescription>
          <QrCode variant={variant} size={big} />
        </DialogContent>
      </Dialog>
    </>
  );
}
