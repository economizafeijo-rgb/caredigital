import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccessStatus = "loading" | "public" | "client" | "admin" | "unlinked";
export type Access = { status: AccessStatus; name: string; email: string };

// Somente apresentação: quem autoriza de fato é o RLS do banco.
const ADMIN_EMAIL = "francdenisbr@gmail.com";
const guest: Access = { status: "public", name: "", email: "" };

/** Perfil da sessão atual, compartilhado por shell, homepage e área do cliente. */
export function useAccess(): Access {
  const [access, setAccess] = useState<Access>({ status: "loading", name: "", email: "" });
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        const user = data.user;
        if (!user) { setAccess(guest); return; }
        const email = (user.email ?? "").trim().toLowerCase();
        if (email === ADMIN_EMAIL) { setAccess({ status: "admin", name: "Administrador", email }); return; }
        const db = supabase as any;
        const grants = await db.from("care_patient_access").select("patient_id").eq("user_id", user.id).limit(1);
        const patientId = grants.data?.[0]?.patient_id;
        if (!active) return;
        if (grants.error || !patientId) { setAccess({ status: "unlinked", name: "", email }); return; }
        const person = await db.from("care_patients").select("full_name").eq("id", patientId).limit(1);
        if (!active) return;
        setAccess({ status: "client", name: person.data?.[0]?.full_name || "Meu acompanhamento", email });
      } catch {
        if (active) setAccess(guest);
      }
    };
    void check();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  return access;
}
