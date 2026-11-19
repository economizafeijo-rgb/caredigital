-- Fase de implantação: só o administrador consegue registrar pedidos (testes). Para abrir as vendas, troque para true.
create or replace function public.care_store_sales_open()
returns boolean language sql immutable as $$ select false $$;

create or replace function public.care_store_orders_sales_gate()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.care_store_sales_open() and not public.is_nextvita_platform_admin() then
    raise exception 'Store sales not open yet';
  end if;
  return new;
end;
$$;
drop trigger if exists care_store_orders_sales_gate on public.care_store_orders;
create trigger care_store_orders_sales_gate before insert on public.care_store_orders
  for each row execute function public.care_store_orders_sales_gate();
