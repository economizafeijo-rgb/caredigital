import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, Mail, MapPin, MessageSquareText, Phone, Send, Store } from "lucide-react";
import { segmentLabel } from "@/lib/marketplace";
import {
  REQUEST_STATUS,
  listSellerRequests,
  updateSellerRequest,
  type SellerRequest,
} from "@/lib/admin-stores";
import { NewStoreModal } from "./NewStoreModal";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Rio_Branco",
    dateStyle: "short",
    timeStyle: "short",
  });

type ReplyKind = "aceitar" | "recusar" | "info";

const REPLY_TEXT: Record<ReplyKind, { subject: string; body: (r: SellerRequest) => string }> = {
  aceitar: {
    subject: "Sua solicitação na NextVita foi aprovada",
    body: (r) =>
      `Olá, ${r.owner_name}! Recebemos o cadastro de ${r.business_name} e ele foi aprovado. Em instantes enviaremos o acesso ao painel da loja. Qualquer dúvida, é só responder esta mensagem.`,
  },
  recusar: {
    subject: "Sobre sua solicitação na NextVita",
    body: (r) =>
      `Olá, ${r.owner_name}! Agradecemos o interesse em vender na NextVita. Neste momento não conseguimos aprovar o cadastro de ${r.business_name}. Se quiser, responda esta mensagem para entendermos o que podemos ajustar.`,
  },
  info: {
    subject: "Precisamos de mais informações da sua loja",
    body: (r) =>
      `Olá, ${r.owner_name}! Estamos analisando o cadastro de ${r.business_name}. Para continuar, precisamos de mais informações: (descreva aqui o que falta). Pode responder esta mensagem.`,
  },
};

const REPLY_LABEL: Record<ReplyKind, string> = {
  aceitar: "Aceitar",
  recusar: "Recusar",
  info: "Pedir informações",
};

/** Solicitações de quem quer vender na plataforma: avaliar, responder, recusar ou criar a loja. */
export function SellerRequestsPanel({
  onCount,
  onOpenVendor,
}: {
  onCount?: (n: number) => void;
  onOpenVendor: (id: string) => void;
}) {
  const [items, setItems] = useState<SellerRequest[] | null>(null);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState<SellerRequest | null>(null);
  const [filter, setFilter] = useState<"abertas" | "todas">("abertas");
  const [busy, setBusy] = useState("");
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyKind, setReplyKind] = useState<ReplyKind>("aceitar");
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = await listSellerRequests();
      setItems(rows);
      onCount?.(rows.filter((r) => r.status === "nova" || r.status === "em_analise").length);
    } catch (e) {
      setItems([]);
      setErr(e instanceof Error ? e.message : "Não foi possível carregar as solicitações.");
    }
  }, [onCount]);
  useEffect(() => {
    void load();
  }, [load]);

  function openReply(r: SellerRequest, kind: ReplyKind) {
    setReplyId(r.id);
    setReplyKind(kind);
    setReplyText(REPLY_TEXT[kind].body(r));
  }

  async function registerReply(r: SellerRequest) {
    const text = replyText.trim();
    if (!text) return setErr("Escreva a resposta antes de registrar.");
    const status: SellerRequest["status"] =
      replyKind === "recusar" ? "recusada" : replyKind === "info" ? "em_analise" : r.status;
    const stamp = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Rio_Branco",
      dateStyle: "short",
      timeStyle: "short",
    });
    setBusy(r.id);
    try {
      await updateSellerRequest(r.id, status, `[${stamp}] ${REPLY_LABEL[replyKind]}: ${text}`);
      setReplyId(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível registrar a resposta.");
    } finally {
      setBusy("");
    }
  }

  async function setStatus(r: SellerRequest, status: SellerRequest["status"]) {
    let notes = r.admin_notes ?? "";
    if (status === "recusada") {
      const reason = window.prompt("Motivo da recusa (fica só para a administração):", notes);
      if (reason === null) return;
      notes = reason;
    }
    setBusy(r.id);
    try {
      await updateSellerRequest(r.id, status, notes);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível atualizar.");
    } finally {
      setBusy("");
    }
  }

  const shown = (items ?? []).filter(
    (r) => filter === "todas" || r.status === "nova" || r.status === "em_analise",
  );

  return (
    <div className="grid gap-3">
      {creating && (
        <NewStoreModal
          request={creating}
          onClose={() => {
            setCreating(null);
            void load();
          }}
          onCreated={(id) => {
            setCreating(null);
            void load();
            onOpenVendor(id);
          }}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Quem quer vender preenche o formulário em{" "}
          <strong className="text-foreground">/lojista</strong>. Você avalia, cria a loja com o
          login e coloca no ar.
        </p>
        <div
          role="tablist"
          className="flex gap-1 rounded-xl border border-border bg-card p-1 text-xs font-semibold"
        >
          {(
            [
              ["abertas", "Abertas"],
              ["todas", "Todas"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={`h-7 rounded-lg px-3 ${filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {err && (
        <p
          role="alert"
          className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {err}
        </p>
      )}
      {items === null ? (
        <p className="grid place-items-center py-12 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </p>
      ) : !shown.length ? (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          <Inbox size={24} />
          {filter === "abertas"
            ? "Nenhuma solicitação aguardando avaliação."
            : "Nenhuma solicitação ainda."}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((r) => (
            <li
              key={r.id}
              className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-base font-extrabold text-primary">
                  {r.business_name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-[15px]">{r.business_name}</strong>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${REQUEST_STATUS[r.status].tone}`}
                    >
                      {REQUEST_STATUS[r.status].label}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.owner_name} · {segmentLabel(r.segment)} · enviada {when(r.created_at)}
                  </p>
                </div>
              </div>
              <dl className="grid gap-1.5 text-[13px]">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="shrink-0 text-muted-foreground" />
                  <a href={`mailto:${r.email}`} className="truncate text-primary hover:underline">
                    {r.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="shrink-0 text-muted-foreground" />
                  <a
                    href={`https://wa.me/55${r.phone.replace(/\D/g, "").replace(/^55/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {r.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0 text-muted-foreground" />
                  <span>
                    {r.address ? `${r.address} · ` : ""}
                    {r.city}
                  </span>
                </div>
                {r.message && (
                  <div className="flex items-start gap-2">
                    <MessageSquareText
                      size={14}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <span className="whitespace-pre-wrap text-muted-foreground">{r.message}</span>
                  </div>
                )}
                {r.admin_notes && (
                  <p className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs">
                    <strong>Nota da administração:</strong> {r.admin_notes}
                  </p>
                )}
              </dl>
              {replyId === r.id && (
                <div className="grid gap-2 rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(REPLY_LABEL) as ReplyKind[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => openReply(r, k)}
                        className={`h-8 rounded-lg px-2.5 text-xs font-semibold ${replyKind === k ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}
                      >
                        {REPLY_LABEL[k]}
                      </button>
                    ))}
                  </div>
                  <label className="grid gap-1 text-xs font-semibold">
                    Mensagem para o interessado
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      maxLength={1200}
                      className="rounded-lg border border-border bg-surface p-2 text-sm font-normal"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/55${r.phone.replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(replyText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Send size={14} /> Enviar pelo WhatsApp
                    </a>
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent(REPLY_TEXT[replyKind].subject)}&body=${encodeURIComponent(replyText)}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted"
                    >
                      <Mail size={14} /> Enviar por e-mail
                    </a>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void registerReply(r)}
                      className="h-9 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      Registrar resposta
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyId(null)}
                      className="h-9 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    >
                      Fechar
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    O envio acontece no seu WhatsApp ou e-mail. "Registrar resposta" guarda a
                    mensagem no pedido e atualiza a situação.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {replyId !== r.id && (
                  <button
                    type="button"
                    onClick={() => openReply(r, "aceitar")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted"
                  >
                    <MessageSquareText size={14} /> Responder
                  </button>
                )}
                {r.status === "aprovada" && r.vendor_id ? (
                  <button
                    type="button"
                    onClick={() => onOpenVendor(r.vendor_id as string)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                  >
                    <Store size={14} /> Abrir loja criada
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setCreating(r)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Store size={14} /> Aprovar e criar loja
                    </button>
                    {r.status === "nova" && (
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => void setStatus(r, "em_analise")}
                        className="h-9 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-muted"
                      >
                        Marcar em análise
                      </button>
                    )}
                    {r.status !== "recusada" && (
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => void setStatus(r, "recusada")}
                        className="h-9 rounded-xl px-3 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                      >
                        Recusar
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
