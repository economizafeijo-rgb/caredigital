-- Tempos de inatividade configuráveis pelo dono da loja (ou administrador da plataforma).
-- As colunas não estão liberadas para update direto: a alteração passa por esta função.

create or replace function public.care_store_set_inactivity(
  p_vendor uuid,
  p_warn integer,
  p_grace integer,
  p_close integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.care_store_vendors v
     where v.id = p_vendor
       and (v.owner_id = auth.uid() or public.is_nextvita_platform_admin())
  ) then
    raise exception 'Sem permissão para alterar os tempos desta loja.' using errcode = '42501';
  end if;

  if p_warn is null or p_grace is null or p_close is null
     or p_warn not between 1 and 60
     or p_grace not between 1 and 60
     or p_close not between 1 and 60 then
    raise exception 'Os tempos devem estar entre 1 e 60 minutos.' using errcode = '22023';
  end if;

  update public.care_store_vendors
     set inactivity_warn_minutes = p_warn,
         inactivity_grace_minutes = p_grace,
         inactivity_close_minutes = p_close,
         updated_at = now()
   where id = p_vendor;
end $$;

revoke all on function public.care_store_set_inactivity(uuid, integer, integer, integer) from public, anon;
grant execute on function public.care_store_set_inactivity(uuid, integer, integer, integer) to authenticated;
