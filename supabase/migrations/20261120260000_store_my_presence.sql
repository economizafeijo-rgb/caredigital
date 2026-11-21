-- Estado de presença do próprio atendente (se ele está online), para o painel recarregar no estado certo.
create or replace function public.care_store_my_presence(p_vendor uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_online boolean;
begin
  if auth.uid() is null or not public.care_store_can_attend(p_vendor) then raise exception 'Not allowed'; end if;
  select online into v_online from public.care_store_presence
   where vendor_id = p_vendor and user_id = auth.uid();
  return jsonb_build_object('online', coalesce(v_online, false));
end;
$$;
revoke all on function public.care_store_my_presence(uuid) from public, anon;
grant execute on function public.care_store_my_presence(uuid) to authenticated;
