/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Evento global: a meta de peso mudou. Toda tela que usa a meta recarrega a partir dele. */
export const WEIGHT_GOAL_EVENT = "nv-weight-goal-changed";
export const MIN_GOAL_KG = 30;
export const MAX_GOAL_KG = 250;

export const announceWeightGoalChange = () => {
  window.dispatchEvent(new Event(WEIGHT_GOAL_EVENT));
  window.dispatchEvent(new Event("nv-profile-changed"));
};

/** Contador que sobe a cada mudança da meta; entra nas dependências dos efeitos que carregam dados. */
export function useWeightGoalVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(WEIGHT_GOAL_EVENT, bump);
    return () => window.removeEventListener(WEIGHT_GOAL_EVENT, bump);
  }, []);
  return version;
}

export function parseGoalKg(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < MIN_GOAL_KG || n > MAX_GOAL_KG) return null;
  return Math.round(n * 10) / 10;
}

/** Faixa de peso com IMC 18,5–24,9 para a altura informada. */
export function healthyWeightRange(heightCm: number | null) {
  if (!heightCm || heightCm < 100 || heightCm > 230) return null;
  const m = heightCm / 100;
  return {
    min: Math.round(18.5 * m * m * 10) / 10,
    max: Math.round(24.9 * m * m * 10) / 10,
  };
}

/** Salva (ou limpa, com null) a meta e avisa o resto do sistema. Lança Error com texto para o usuário. */
export async function saveWeightGoal(patientId: string, ownerId: string, kg: number | null) {
  const db = supabase as any;
  const auth = await db.auth.getUser();
  if (auth.error || !auth.data.user) throw Error("Faça login para salvar a meta.");
  const row = {
    target_weight_kg: kg,
    updated_by: auth.data.user.id,
    updated_at: new Date().toISOString(),
  };
  const found = await db
    .from("care_nutrition_preferences")
    .select("patient_id")
    .eq("patient_id", patientId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (found.error) throw Error("Não foi possível consultar as metas atuais.");
  const result = found.data
    ? await db
        .from("care_nutrition_preferences")
        .update(row)
        .eq("patient_id", patientId)
        .eq("owner_id", ownerId)
    : await db
        .from("care_nutrition_preferences")
        .insert({ ...row, patient_id: patientId, owner_id: ownerId });
  if (result.error) throw Error("Não foi possível salvar a meta: " + result.error.message);
  announceWeightGoalChange();
}
