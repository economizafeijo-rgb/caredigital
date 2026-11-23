import { useEffect, useLayoutEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccessStatus = "loading" | "public" | "client" | "admin" | "vendor" | "unlinked";
export type Access = { status: AccessStatus; name: string; email: string };

// Somente apresentação: quem autoriza de fato é o RLS do banco.
const ADMIN_EMAIL = "francdenisbr@gmail.com";
const guest: Access = { status: "public", name: "", email: "" };
const CACHE = "nv-access";
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Último perfil conhecido deste aparelho: evita esperar a rede para desenhar a página. */
function readCache(): Access | null {
  try {
    const raw = localStorage.getItem(CACHE);
    const v = raw ? (JSON.parse(raw) as Access) : null;
    return v && v.status && v.status !== "loading" && v.status !== "public" ? v : null;
  } catch {
    return null;
  }
}
function writeCache(a: Access | null) {
  try {
    if (a && a.status !== "public" && a.status !== "loading")
      localStorage.setItem(CACHE, JSON.stringify(a));
    else localStorage.removeItem(CACHE);
  } catch {
    /* sem storage */
  }
}

/** Perfil da sessão atual, compartilhado por shell, homepage e área do cliente. */
export function useAccess(): Access {
  const [access, setAccess] = useState<Access>({ status: "loading", name: "", email: "" });
  useIsoLayoutEffect(() => {
    const cached = readCache();
    if (cached) setAccess(cached);
  }, []);
  useEffect(() => {
    let active = true;
    const set = (next: Access) => {
      writeCache(next);
      setAccess(next);
    };
    const check = async () => {
      try {
        // Sessão guardada no aparelho (sem rede): visitante sem login já vê a página na hora.
        const local = await supabase.auth.getSession();
        if (!active) return;
        if (!local.data.session) {
          set(guest);
          return;
        }
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        const user = data.user;
        if (!user) {
          set(guest);
          return;
        }
        const email = (user.email ?? "").trim().toLowerCase();
        if (email === ADMIN_EMAIL) {
          set({ status: "admin", name: "Administrador", email });
          return;
        }
        const db = supabase as any;
        const grants = await db
          .from("care_patient_access")
          .select("patient_id")
          .eq("user_id", user.id)
          .limit(1);
        const patientId = grants.data?.[0]?.patient_id;
        if (!active) return;
        if (grants.error || !patientId) {
          // Sem prontuário: se a conta é dona de uma loja, ela é lojista.
          const store = await db
            .from("care_store_vendors")
            .select("name")
            .eq("owner_id", user.id)
            .order("name")
            .limit(1);
          if (!active) return;
          if (store.data?.[0]) {
            set({ status: "vendor", name: store.data[0].name as string, email });
            return;
          }
          set({ status: "unlinked", name: "", email });
          return;
        }
        const person = await db
          .from("care_patients")
          .select("full_name")
          .eq("id", patientId)
          .limit(1);
        if (!active) return;
        set({
          status: "client",
          name: person.data?.[0]?.full_name || "Meu acompanhamento",
          email,
        });
      } catch {
        if (active) set(guest);
      }
    };
    void check();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void check();
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  return access;
}
