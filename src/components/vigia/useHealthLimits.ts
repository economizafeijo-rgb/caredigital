/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeLimits, type LimitProfile } from "@/lib/health-limits";

/** Limites de cafeína e lactose calculados do perfil. Não há campo para editar: só mudam com o perfil. */
export function useHealthLimits(patientId: string) {
  const [profile, setProfile] = useState<LimitProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      void (supabase as any)
        .from("care_patients")
        .select("birth_date,sex,weight_kg,height_cm,health_conditions")
        .eq("id", patientId)
        .maybeSingle()
        .then(({ data }: any) => {
          if (!active) return;
          setProfile(data ?? null);
          setLoaded(true);
        });
    load();
    window.addEventListener("nv-profile-changed", load);
    return () => {
      active = false;
      window.removeEventListener("nv-profile-changed", load);
    };
  }, [patientId]);
  const limits = useMemo(() => computeLimits(profile), [profile]);
  return { limits, profile, loaded };
}
