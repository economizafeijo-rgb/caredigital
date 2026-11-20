/**
 * Frequência cardíaca por Bluetooth (padrão GATT Heart Rate, serviço 0x180D / medição 0x2A37).
 * Funciona no Chrome e no Edge (computador e Android) com cintas peitorais e relógios que
 * transmitem a frequência (Polar, Garmin "Transmitir FC", Coros, Wahoo, Amazfit e similares).
 */

export type HrSample = { t: number; bpm: number; rr?: number[] };
export type HrZone = { key: string; label: string; from: number; to: number; color: string };

/** Lê o valor da característica 0x2A37 (spec Bluetooth SIG). */
export function parseHeartRate(view: DataView): {
  bpm: number;
  contact: boolean | null;
  rr: number[];
} {
  const flags = view.getUint8(0);
  const wide = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contact = contactSupported ? (flags & 0x02) !== 0 : null;
  const energy = (flags & 0x08) !== 0;
  const hasRr = (flags & 0x10) !== 0;
  let offset = 1;
  const bpm = wide ? view.getUint16(offset, true) : view.getUint8(offset);
  offset += wide ? 2 : 1;
  if (energy) offset += 2;
  const rr: number[] = [];
  if (hasRr) {
    for (; offset + 1 < view.byteLength; offset += 2)
      rr.push(Math.round((view.getUint16(offset, true) / 1024) * 1000));
  }
  return { bpm, contact, rr };
}

/** Zonas pela frequência máxima estimada (Tanaka: 208 − 0,7 × idade). */
export function heartZones(age?: number | null): { max: number; zones: HrZone[] } {
  const max = Math.round(208 - 0.7 * (age && age > 5 && age < 110 ? age : 35));
  const z = (p: number) => Math.round(max * p);
  return {
    max,
    zones: [
      { key: "repouso", label: "Repouso", from: 0, to: z(0.5) - 1, color: "#64748b" },
      { key: "leve", label: "Leve", from: z(0.5), to: z(0.6) - 1, color: "#38bdf8" },
      { key: "queima", label: "Queima de gordura", from: z(0.6), to: z(0.7) - 1, color: "#22c55e" },
      { key: "aerobico", label: "Aeróbico", from: z(0.7), to: z(0.8) - 1, color: "#eab308" },
      { key: "anaerobico", label: "Anaeróbico", from: z(0.8), to: z(0.9) - 1, color: "#f97316" },
      { key: "maximo", label: "Máximo", from: z(0.9), to: 260, color: "#ef4444" },
    ],
  };
}
export const zoneOf = (bpm: number, zones: HrZone[]) =>
  zones.find((zn) => bpm >= zn.from && bpm <= zn.to) ?? zones[0];

export const bluetoothSupport = (): "ok" | "ios" | "unsupported" | "insecure" => {
  if (typeof navigator === "undefined") return "unsupported";
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  if ("bluetooth" in navigator) return "ok";
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : "unsupported";
};

type Listener = (s: HrSample & { contact: boolean | null }) => void;

/** Conexão com o sensor: pede o aparelho, assina as medições e tenta reconectar se cair. */
export class HeartRateLink {
  private device: any = null;
  private char: any = null;
  private stopped = false;
  name = "";
  battery: number | null = null;
  constructor(
    private onSample: Listener,
    private onState: (
      s: "conectando" | "conectado" | "reconectando" | "desconectado",
      detail?: string,
    ) => void,
  ) {}

  async connect() {
    const bt = (navigator as any).bluetooth;
    this.stopped = false;
    this.onState("conectando");
    this.device = await bt.requestDevice({
      filters: [{ services: ["heart_rate"] }],
      optionalServices: ["battery_service"],
    });
    this.name = this.device.name || "Sensor cardíaco";
    this.device.addEventListener("gattserverdisconnected", this.handleDrop);
    await this.attach();
  }

  private handleDrop = async () => {
    if (this.stopped) return;
    this.onState("reconectando");
    for (let i = 0; i < 4 && !this.stopped; i++) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      try {
        await this.attach();
        return;
      } catch {
        /* tenta de novo */
      }
    }
    this.onState("desconectado", "O sensor saiu do alcance.");
  };

  private async attach() {
    const server = await this.device.gatt.connect();
    const service = await server.getPrimaryService("heart_rate");
    this.char = await service.getCharacteristic("heart_rate_measurement");
    this.char.addEventListener("characteristicvaluechanged", this.handleValue);
    await this.char.startNotifications();
    try {
      const bs = await server.getPrimaryService("battery_service");
      const level = await (await bs.getCharacteristic("battery_level")).readValue();
      this.battery = level.getUint8(0);
    } catch {
      this.battery = null;
    }
    this.onState("conectado");
  }

  private handleValue = (e: Event) => {
    const value = (e.target as any).value as DataView;
    const { bpm, contact, rr } = parseHeartRate(value);
    if (bpm > 0) this.onSample({ t: Date.now(), bpm, rr: rr.length ? rr : undefined, contact });
  };

  async disconnect() {
    this.stopped = true;
    try {
      this.char?.removeEventListener("characteristicvaluechanged", this.handleValue);
      await this.char?.stopNotifications();
    } catch {
      /* já desconectado */
    }
    try {
      this.device?.removeEventListener("gattserverdisconnected", this.handleDrop);
      this.device?.gatt?.disconnect();
    } catch {
      /* ok */
    }
    this.onState("desconectado");
  }
}

/** Simulação para conhecer a tela sem sensor: varia como um treino leve. Sempre marcada como simulação. */
export function startSimulation(onSample: Listener) {
  let bpm = 72;
  let t0 = Date.now();
  const id = window.setInterval(() => {
    const s = (Date.now() - t0) / 1000;
    const target = 72 + 60 * Math.max(0, Math.sin(s / 40)) + 8 * Math.sin(s / 7);
    bpm += (target - bpm) * 0.25 + (Math.random() - 0.5) * 2;
    onSample({ t: Date.now(), bpm: Math.round(bpm), contact: true });
  }, 1000);
  return () => {
    window.clearInterval(id);
    t0 = 0;
  };
}
