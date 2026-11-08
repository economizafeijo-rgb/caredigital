-- Remove anonymous access to patient-care tables. Only public catalogs remain readable.
REVOKE ALL PRIVILEGES ON TABLE
  public.care_activity_log, public.care_body_measurements, public.care_client_beverages,
  public.care_daily_checklist, public.care_diets, public.care_doses,
  public.care_food_consumptions, public.care_food_meal_groups, public.care_hydration,
  public.care_hydration_daily_goals, public.care_hydration_goal_targets,
  public.care_hydration_profiles, public.care_hydration_responses,
  public.care_hydration_suggested_portions, public.care_meal_details, public.care_meals,
  public.care_medications, public.care_nutrition_meal_logs, public.care_nutrition_preferences,
  public.care_observations, public.care_patient_access, public.care_patient_diets,
  public.care_patient_protocols, public.care_patients, public.care_profiles,
  public.care_protocols, public.care_task_resolutions, public.care_team
FROM anon;

GRANT SELECT ON TABLE public.care_demo_catalog, public.care_food_catalog TO anon;

REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
  public.care_activity_log, public.care_body_measurements, public.care_client_beverages,
  public.care_daily_checklist, public.care_demo_catalog, public.care_diets, public.care_doses,
  public.care_food_catalog, public.care_food_consumptions, public.care_food_meal_groups,
  public.care_hydration, public.care_hydration_daily_goals, public.care_hydration_goal_targets,
  public.care_hydration_profiles, public.care_hydration_responses,
  public.care_hydration_suggested_portions, public.care_meal_details, public.care_meals,
  public.care_medications, public.care_nutrition_meal_logs, public.care_nutrition_preferences,
  public.care_observations, public.care_patient_access, public.care_patient_diets,
  public.care_patient_protocols, public.care_patients, public.care_profiles,
  public.care_protocols, public.care_task_resolutions, public.care_team
FROM anon, authenticated;
