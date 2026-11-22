import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Depois que o pedido chega a "entregue/retirado", o cliente confirma o recebimento e avalia a loja. */
export function OrderReview({
  orderId,
  vendorId,
  name,
}: {
  orderId: string;
  vendorId: string;
  name: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const [done, setDone] = useState<{ rating: number; comment: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    void db
      .from("care_store_reviews")
      .select("rating,comment")
      .eq("order_id", orderId)
      .maybeSingle()
      .then((r: { data: { rating: number; comment: string | null } | null }) => {
        if (!alive) return;
        setDone(r.data ?? null);
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [db, orderId]);

  if (!loaded) return null;

  async function send() {
    if (!rating) return setErr("Escolha de 1 a 5 estrelas.");
    setBusy(true);
    setErr("");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("care_store_reviews").insert({
      vendor_id: vendorId,
      order_id: orderId,
      user_id: u.user?.id,
      author: name.split(" ")[0] || null,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) return setErr("Não foi possível enviar agora. Tente de novo.");
    setDone({ rating, comment: comment.trim() || null });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-label="Avaliação">
      {done ? (
        <>
          <h2 className="text-sm font-bold">Recebimento confirmado. Obrigado pela avaliação!</h2>
          <p
            className="mt-1 flex items-center gap-0.5 text-amber-500"
            aria-label={`${done.rating} de 5`}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={16} fill={n <= done.rating ? "currentColor" : "none"} />
            ))}
          </p>
          {done.comment && <p className="mt-1 text-[13px] text-muted-foreground">{done.comment}</p>}
        </>
      ) : (
        <>
          <h2 className="text-sm font-bold">Recebeu o seu pedido? Confirme e avalie a loja</h2>
          <div role="radiogroup" aria-label="Nota" className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                onClick={() => setRating(n)}
                className="grid size-9 place-items-center rounded-lg text-amber-500 hover:bg-muted"
              >
                <Star size={20} fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Conte como foi (opcional)"
            className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          {err && (
            <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">
              {err}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void send()}
            className="mt-3 h-10 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Enviando…" : "Confirmar recebimento e avaliar"}
          </button>
        </>
      )}
    </section>
  );
}
