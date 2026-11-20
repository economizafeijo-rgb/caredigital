/** Avisos sonoros do chat, gerados no próprio aparelho (sem arquivos de áudio). */
export type SoundKind = "incoming" | "sent" | "turn" | "order";
const KEY = "nv-chat-sound";
let ctx: AudioContext | null = null;

export const soundEnabled = () => {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
};
export function setSoundEnabled(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* sem armazenamento */
  }
  window.dispatchEvent(new Event("nv-chat-sound"));
}
/** Navegadores só liberam áudio após um toque do usuário. */
export function unlockSound() {
  try {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* sem áudio */
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockSound, { passive: true });
  window.addEventListener("keydown", unlockSound);
}

const TONES: Record<SoundKind, [number, number, number][]> = {
  incoming: [
    [880, 0, 0.12],
    [1175, 0.13, 0.18],
  ],
  sent: [[660, 0, 0.08]],
  turn: [
    [784, 0, 0.12],
    [988, 0.14, 0.12],
    [1319, 0.28, 0.26],
  ],
  order: [
    [523, 0, 0.12],
    [659, 0.12, 0.12],
    [784, 0.24, 0.12],
    [1047, 0.36, 0.3],
  ],
};

export function playSound(kind: SoundKind) {
  if (!soundEnabled()) return;
  try {
    unlockSound();
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    for (const [freq, at, dur] of TONES[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(kind === "sent" ? 0.05 : 0.14, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + dur + 0.02);
    }
    if (typeof navigator !== "undefined" && kind !== "sent")
      navigator.vibrate?.(kind === "turn" ? [80, 60, 80] : 60);
  } catch {
    /* sem áudio */
  }
}
