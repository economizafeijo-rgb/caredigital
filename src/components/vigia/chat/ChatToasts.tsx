import { useEffect, useState } from "react";
import { Bell, ClipboardList, MessageCircle, Volume2, VolumeX, X } from "lucide-react";
import { playSound, setSoundEnabled, soundEnabled, type SoundKind } from "@/lib/chat-sound";

export type ChatToast = {
  id: number;
  title: string;
  body: string;
  tone: "message" | "order" | "turn";
  onOpen?: () => void;
};
const EVT = "nv-chat-toast";
let seq = 0;

/** Mostra um aviso na tela e toca o som correspondente. */
export function pushChatToast(t: Omit<ChatToast, "id">, sound: SoundKind | null = "incoming") {
  if (sound) playSound(sound);
  window.dispatchEvent(new CustomEvent<ChatToast>(EVT, { detail: { ...t, id: ++seq } }));
}

const TONE = {
  message: { icon: MessageCircle, bar: "#0ea5e9" },
  order: { icon: ClipboardList, bar: "#10b981" },
  turn: { icon: Bell, bar: "#f59e0b" },
} as const;

/** Pop-ups de notificação no canto da tela, empilhados e com fechamento automático. */
export function ChatToastHost() {
  const [list, setList] = useState<ChatToast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<ChatToast>).detail;
      setList((cur) => [...cur.slice(-3), t]);
      window.setTimeout(() => setList((cur) => cur.filter((x) => x.id !== t.id)), 7000);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-3 z-[120] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2"
    >
      {list.map((t) => {
        const { icon: Icon, bar } = TONE[t.tone];
        return (
          <div
            key={t.id}
            className="nv-pop pointer-events-auto relative overflow-hidden border border-border bg-card text-card-foreground shadow-2xl"
          >
            <button
              type="button"
              onClick={() => {
                t.onOpen?.();
                setList((cur) => cur.filter((x) => x.id !== t.id));
              }}
              className="flex w-full items-start gap-3 px-3.5 py-3 text-left"
            >
              <span
                className="grid size-8 shrink-0 place-items-center text-white"
                style={{ background: bar }}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[13px]">{t.title}</strong>
                <span className="line-clamp-2 text-xs text-muted-foreground">{t.body}</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setList((cur) => cur.filter((x) => x.id !== t.id))}
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
            <span
              aria-hidden="true"
              className="nv-toast-bar absolute bottom-0 left-0 h-0.5"
              style={{ background: bar }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Liga e desliga os avisos sonoros. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const sync = () => setOn(soundEnabled());
    sync();
    window.addEventListener("nv-chat-sound", sync);
    return () => window.removeEventListener("nv-chat-sound", sync);
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        setSoundEnabled(!on);
        if (!on) playSound("sent");
      }}
      aria-pressed={on}
      aria-label={on ? "Desligar avisos sonoros" : "Ligar avisos sonoros"}
      title={on ? "Som ligado" : "Som desligado"}
      className={`grid size-8 place-items-center border border-border hover:bg-muted ${className}`}
    >
      {on ? <Volume2 size={15} /> : <VolumeX size={15} />}
    </button>
  );
}
