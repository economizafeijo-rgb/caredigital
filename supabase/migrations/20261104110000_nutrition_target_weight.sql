-- Optional personal target weight; distinct from actual measured weight.
alter table public.care_nutrition_preferences add column if not exists target_weight_kg numeric(6,2) check (target_weight_kg between 30 and 300);
