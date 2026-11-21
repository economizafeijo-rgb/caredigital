-- Estado de funcionamento da loja (aberta / fechada), controlado pelo lojista.
alter table public.care_store_vendors add column if not exists is_open boolean not null default false;
alter table public.care_store_vendors add column if not exists opened_at timestamptz;

create or replace function public.care_store_set_open(p_vendor uuid, p_open boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.care_store_vendors%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_open is null then raise exception 'Invalid state'; end if;
  if not public.care_store_can_attend(p_vendor) then raise exception 'Not allowed'; end if;

  -- Só loja aprovada pode abrir. Fechar é sempre permitido.
  if p_open and not exists (
    select 1 from public.care_store_vendors where id = p_vendor and status = 'ativo'
  ) then
    raise exception 'Store not active';
  end if;

  update public.care_store_vendors
     set is_open = p_open,
         opened_at = case when p_open then now() else null end
   where id = p_vendor
   returning * into v_row;

  if not found then raise exception 'Store not found'; end if;
  return jsonb_build_object('vendor_id', v_row.id, 'is_open', v_row.is_open, 'opened_at', v_row.opened_at);
end;
$$;

revoke all on function public.care_store_set_open(uuid, boolean) from public, anon;
grant execute on function public.care_store_set_open(uuid, boolean) to authenticated;
