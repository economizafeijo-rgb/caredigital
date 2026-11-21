-- Parâmetros da moderação de mensagens: leitura e alteração só para o administrador da plataforma.
-- A tabela tem RLS sem acesso direto; tudo passa por estas funções.

create or replace function public.care_store_moderation_get()
returns table(
  out_strikes_limit integer,
  out_strikes_window_minutes integer,
  out_block_minutes integer,
  out_rate_max integer,
  out_rate_window_seconds integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then
    raise exception 'Sem permissão para ver a moderação.' using errcode = '42501';
  end if;
  return query
    select s.strikes_limit, s.strikes_window_minutes, s.block_minutes, s.rate_max, s.rate_window_seconds
      from public.care_store_moderation_settings s
     where s.id;
end $$;

create or replace function public.care_store_moderation_set(
  p_strikes_limit integer,
  p_strikes_window_minutes integer,
  p_block_minutes integer,
  p_rate_max integer,
  p_rate_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then
    raise exception 'Sem permissão para alterar a moderação.' using errcode = '42501';
  end if;
  if p_strikes_limit is null or p_strikes_limit not between 1 and 20
     or p_strikes_window_minutes is null or p_strikes_window_minutes not between 1 and 1440
     or p_block_minutes is null or p_block_minutes not between 1 and 1440
     or p_rate_max is null or p_rate_max not between 1 and 100
     or p_rate_window_seconds is null or p_rate_window_seconds not between 1 and 600 then
    raise exception 'Valor fora do limite permitido.' using errcode = '22023';
  end if;
  update public.care_store_moderation_settings
     set strikes_limit = p_strikes_limit,
         strikes_window_minutes = p_strikes_window_minutes,
         block_minutes = p_block_minutes,
         rate_max = p_rate_max,
         rate_window_seconds = p_rate_window_seconds
   where id;
end $$;

revoke all on function public.care_store_moderation_get() from public, anon;
revoke all on function public.care_store_moderation_set(integer, integer, integer, integer, integer) from public, anon;
grant execute on function public.care_store_moderation_get() to authenticated;
grant execute on function public.care_store_moderation_set(integer, integer, integer, integer, integer) to authenticated;
