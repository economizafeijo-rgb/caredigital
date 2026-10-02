import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase-session";
import { Btn, Field, PageHeader, Panel } from "@/components/vigia/ui";

export const Route = createFileRoute("/entrar")({
  head: () => ({ meta: [{ title: "Entrar — DigitalCare" }] }),
  component: Entrar,
});

function Entrar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  return <div className="mx-auto max-w-xl">
    <PageHeader eyebrow="Acesso da equipe" title="Entrar no DigitalCare" />
    <Panel title="Acesso seguro">
      {!isSupabaseConfigured() && <p className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">Supabase ainda não está configurado neste ambiente. Conecte o projeto no Lovable para habilitar a autenticação.</p>}
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        setBusy(false);
        if (error) { setMessage("Não foi possível entrar. Confira seu e-mail e senha ou peça um novo convite ao administrador."); return; }
        await navigate({ to: "/admin" });
      }}>
        <Field label="E-mail cadastrado"><input type="email" autoComplete="username" className="field" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Senha"><input type="password" autoComplete="current-password" className="field" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <Btn type="submit" size="lg" className="w-full" disabled={busy || !isSupabaseConfigured()}>{busy ? "Entrando…" : "Entrar"}</Btn>
      </form>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Contas são criadas por convite do administrador. Dados de clientes ficam protegidos por autenticação e permissões do banco de dados.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary underline underline-offset-4">Voltar ao painel</Link>
    </Panel>
  </div>;
}
