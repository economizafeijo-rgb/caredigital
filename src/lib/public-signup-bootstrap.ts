import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  isValidBirthDate,
  isValidBrazilPhone,
  isValidCpf,
  normalizeBrazilPhone,
  normalizeCpf,
} from "./public-signup-validation";

export type PublicSignupMetadata = {
  fullName: string;
  cpf: string;
  phone: string;
  birthDate: string;
  weightKg: number;
  heightCm: number;
};

/** Último dia do teste: hoje (Acre, UTC-5) mais 7 dias. */
export function trialEndDate(now: Date = new Date()): string {
  const acre = new Date(now.getTime() - 5 * 3_600_000);
  acre.setUTCDate(acre.getUTCDate() + 7);
  return acre.toISOString().slice(0, 10);
}

export function parseSignupMetadata(user: User): PublicSignupMetadata | null {
  const raw = user.user_metadata?.nextvita_signup;
  if (!raw || typeof raw !== "object") return null;
  const fullName = typeof raw.fullName === "string" ? raw.fullName.trim().slice(0, 120) : "";
  const cpf = normalizeCpf(typeof raw.cpf === "string" ? raw.cpf : "");
  const phone = normalizeBrazilPhone(typeof raw.phone === "string" ? raw.phone : "");
  const birthDate = typeof raw.birthDate === "string" ? raw.birthDate : "";
  const weightKg = Number(raw.weightKg);
  const heightCm = Number(raw.heightCm);
  if (
    !fullName ||
    !user.email ||
    !isValidCpf(cpf) ||
    !isValidBrazilPhone(phone) ||
    !isValidBirthDate(birthDate)
  )
    return null;
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 350) return null;
  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 230) return null;
  return { fullName, cpf, phone, birthDate, weightKg, heightCm };
}

export async function bootstrapPublicSignup(user: User): Promise<{ patientId: string }> {
  const metadata = parseSignupMetadata(user);
  const db = supabase as any;
  if (!metadata) {
    const existing = await db
      .from("care_patients")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.id) return { patientId: existing.data.id };
    throw new Error("Dados do cadastro incompletos. Solicite um novo cadastro.");
  }

  const profile = await db
    .from("care_profiles")
    .upsert({ id: user.id, full_name: metadata.fullName }, { onConflict: "id" });
  if (profile.error) throw profile.error;

  const identity = await db
    .from("care_identity_profiles")
    .upsert(
      { user_id: user.id, cpf: metadata.cpf, phone: metadata.phone },
      { onConflict: "user_id" },
    );
  if (identity.error) {
    if (identity.error.code === "23505") throw new Error("Este CPF já está associado a uma conta.");
    throw identity.error;
  }

  let patient = await db
    .from("care_patients")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (patient.error) throw patient.error;
  if (!patient.data?.id) {
    patient = await db
      .from("care_patients")
      .insert({
        owner_id: user.id,
        full_name: metadata.fullName,
        birth_date: metadata.birthDate,
        contact_email: user.email,
        phone: metadata.phone,
        height_cm: metadata.heightCm,
        weight_kg: metadata.weightKg,
        // Todo cadastro novo começa pelo teste grátis de 7 dias (contado no horário do Acre).
        license_plan: "premium",
        license_status: "teste",
        license_expires_on: trialEndDate(),
        signup_source: "teste_gratis",
        trial_started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (patient.error) throw patient.error;
  }

  const patientId = patient.data.id as string;
  const existingAccess = await db
    .from("care_patient_access")
    .select("patient_id")
    .eq("patient_id", patientId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingAccess.error) throw existingAccess.error;
  if (!existingAccess.data) {
    const access = await db.from("care_patient_access").insert({
      patient_id: patientId,
      user_id: user.id,
      owner_id: user.id,
    });
    if (access.error && access.error.code !== "23505") throw access.error;
  }

  const today = new Date().toISOString().slice(0, 10);
  const measurement = await db
    .from("care_body_measurements")
    .select("id")
    .eq("patient_id", patientId)
    .eq("recorded_on", today)
    .maybeSingle();
  if (measurement.error) throw measurement.error;
  if (!measurement.data) {
    const created = await db.from("care_body_measurements").insert({
      patient_id: patientId,
      owner_id: user.id,
      recorded_by: user.id,
      recorded_on: today,
      weight_kg: metadata.weightKg,
      height_cm: metadata.heightCm,
    });
    if (created.error && created.error.code !== "23505") throw created.error;
  }

  const cleanedMetadata = { ...user.user_metadata };
  delete cleanedMetadata.nextvita_signup;
  try {
    await supabase.auth.updateUser({ data: cleanedMetadata });
  } catch {
    /* bootstrap remains complete if metadata cleanup is retried later */
  }
  return { patientId };
}
