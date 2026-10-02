create table if not exists public.diet_plans (
  id text primary key,
  name text not null,
  goal text not null,
  kcal integer not null check (kcal > 0),
  water text not null,
  meals jsonb not null default '[]'::jsonb check (jsonb_typeof(meals) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.diet_plans enable row level security;
grant select on public.diet_plans to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.diet_plans from anon, authenticated;

drop policy if exists "Diet plans are readable" on public.diet_plans;
create policy "Diet plans are readable"
  on public.diet_plans for select to anon, authenticated using (true);

insert into public.diet_plans (id, name, goal, kcal, water, meals)
values
  (
    'di1', 'Hipossódica', 'Controle de pressão', 1800, '2,0 L',
    '[{"time":"07:30","name":"Café da manhã","items":"Pão integral, queijo branco, mamão","kcal":380},{"time":"10:00","name":"Lanche","items":"Iogurte natural com aveia","kcal":180},{"time":"12:30","name":"Almoço","items":"Arroz, feijão, frango grelhado, salada","kcal":620},{"time":"16:00","name":"Lanche","items":"Fruta + castanhas","kcal":200},{"time":"19:30","name":"Jantar","items":"Sopa de legumes com carne magra","kcal":420}]'::jsonb
  ),
  (
    'di2', 'Low-carb', 'Controle glicêmico', 1600, '2,5 L',
    '[{"time":"07:00","name":"Café da manhã","items":"Ovos mexidos, abacate","kcal":350},{"time":"12:00","name":"Almoço","items":"Peixe, legumes no vapor","kcal":550},{"time":"16:00","name":"Lanche","items":"Whey protein + morangos","kcal":220},{"time":"19:00","name":"Jantar","items":"Omelete de espinafre","kcal":380}]'::jsonb
  ),
  (
    'di3', 'Emagrecimento', 'Regime − 0,5 kg/semana', 1400, '3,0 L',
    '[{"time":"07:30","name":"Café da manhã","items":"Tapioca com frango","kcal":300},{"time":"12:30","name":"Almoço","items":"Salada completa, grão-de-bico","kcal":480},{"time":"16:00","name":"Lanche","items":"Maçã + chá verde","kcal":120},{"time":"19:30","name":"Jantar","items":"Caldo de abóbora","kcal":320}]'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  goal = excluded.goal,
  kcal = excluded.kcal,
  water = excluded.water,
  meals = excluded.meals,
  updated_at = now();
