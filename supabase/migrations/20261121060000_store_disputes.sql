-- Disputas e devoluções de pedidos. O cliente abre; o dono da loja responde e resolve.
-- O administrador da plataforma só lê. Toda escrita de status passa pelas funções abaixo.
create table if not exists public.care_store_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.care_store_orders(id) on delete cascade,
  vendor_id uuid not null references public.care_store_vendors(id) on delete cascade,
  user_id uuid not null,
  reason text not null check (reason in ('produto_diferente','defeito','nao_entregue','desistencia','outro')),
  description text not null check (char_length(btrim(description)) between 10 and 1000),
  status text not null default 'aberta' check (status in ('aberta','reembolso_total','reembolso_parcial','devolucao_aceita','recusada','desistida')),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists care_store_disputes_open_idx on public.care_store_disputes(order_id) where status = 'aberta';
create index if not exists care_store_disputes_vendor_idx on public.care_store_disputes(vendor_id, created_at desc);

create table if not exists public.care_store_dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.care_store_disputes(id) on delete cascade,
  author text not null check (author in ('cliente','lojista')),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists care_store_dispute_messages_idx on public.care_store_dispute_messages(dispute_id, created_at);

alter table public.care_store_disputes enable row level security;
alter table public.care_store_dispute_messages enable row level security;
revoke insert, update, delete on public.care_store_disputes from authenticated, anon;
revoke insert, update, delete on public.care_store_dispute_messages from authenticated, anon;
grant select on public.care_store_disputes to authenticated;
grant select on public.care_store_dispute_messages to authenticated;

drop policy if exists disputes_select on public.care_store_disputes;
create policy disputes_select on public.care_store_disputes for select to authenticated
  using (user_id = auth.uid()
    or exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.owner_id = auth.uid())
    or public.is_nextvita_platform_admin());

drop policy if exists dispute_messages_select on public.care_store_dispute_messages;
create policy dispute_messages_select on public.care_store_dispute_messages for select to authenticated
  using (exists (
    select 1 from public.care_store_disputes d
     where d.id = dispute_id
       and (d.user_id = auth.uid()
         or exists (select 1 from public.care_store_vendors v where v.id = d.vendor_id and v.owner_id = auth.uid())
         or public.is_nextvita_platform_admin())
  ));

-- Cliente abre disputa em pedido próprio, em até 30 dias, sem pedido cancelado.
create or replace function public.care_store_open_dispute(p_order uuid, p_reason text, p_description text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  o public.care_store_orders%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into o from public.care_store_orders where id = p_order;
  if not found or o.user_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if o.status = 'cancelado' then raise exception 'Pedido cancelado não aceita disputa'; end if;
  if now() > o.created_at + interval '30 days' then raise exception 'Prazo para disputa encerrado'; end if;
  if p_reason not in ('produto_diferente','defeito','nao_entregue','desistencia','outro') then
    raise exception 'Motivo inválido';
  end if;
  if char_length(btrim(coalesce(p_description, ''))) < 10 or char_length(btrim(p_description)) > 1000 then
    raise exception 'Descrição deve ter de 10 a 1000 caracteres';
  end if;

  begin
    insert into public.care_store_disputes(order_id, vendor_id, user_id, reason, description)
    values (o.id, o.vendor_id, auth.uid(), p_reason, btrim(p_description))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Já existe uma disputa aberta para este pedido';
  end;
  return v_id;
end;
$$;

-- Mensagem na disputa: o autor é derivado de quem chama (dono = lojista, cliente = cliente).
create or replace function public.care_store_dispute_message(p_dispute uuid, p_body text)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  d public.care_store_disputes%rowtype;
  v_author text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into d from public.care_store_disputes where id = p_dispute;
  if not found then raise exception 'Dispute not found'; end if;
  if d.status <> 'aberta' then raise exception 'Disputa já encerrada'; end if;
  if exists (select 1 from public.care_store_vendors v where v.id = d.vendor_id and v.owner_id = auth.uid()) then
    v_author := 'lojista';
  elsif d.user_id = auth.uid() then
    v_author := 'cliente';
  else
    raise exception 'Not allowed';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) < 1 or char_length(btrim(p_body)) > 1000 then
    raise exception 'Mensagem deve ter de 1 a 1000 caracteres';
  end if;
  insert into public.care_store_dispute_messages(dispute_id, author, body)
  values (d.id, v_author, btrim(p_body));
  update public.care_store_disputes set updated_at = now() where id = d.id;
end;
$$;

-- Cliente desiste enquanto a disputa estiver aberta.
create or replace function public.care_store_dispute_withdraw(p_dispute uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.care_store_disputes
     set status = 'desistida', resolved_at = now(), updated_at = now()
   where id = p_dispute and user_id = auth.uid() and status = 'aberta';
  if not found then raise exception 'Not allowed or already closed'; end if;
end;
$$;

-- Só o dono da loja resolve. Reembolso parcial exige valor entre 1 e o total do pedido.
create or replace function public.care_store_dispute_resolve(
  p_dispute uuid, p_status text, p_amount_cents integer, p_note text
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  d public.care_store_disputes%rowtype;
  v_total integer;
  v_amount integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into d from public.care_store_disputes where id = p_dispute;
  if not found then raise exception 'Dispute not found'; end if;
  if not exists (select 1 from public.care_store_vendors v where v.id = d.vendor_id and v.owner_id = auth.uid()) then
    raise exception 'Not allowed';
  end if;
  if d.status <> 'aberta' then raise exception 'Disputa já encerrada'; end if;
  if p_status not in ('reembolso_total','reembolso_parcial','devolucao_aceita','recusada') then
    raise exception 'Resolução inválida';
  end if;
  if p_note is not null and char_length(p_note) > 1000 then raise exception 'Nota muito longa'; end if;

  select total_cents into v_total from public.care_store_orders where id = d.order_id;
  if p_status = 'reembolso_total' then
    v_amount := v_total;
  elsif p_status = 'reembolso_parcial' then
    if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > v_total then
      raise exception 'Valor do reembolso parcial inválido';
    end if;
    v_amount := p_amount_cents;
  else
    v_amount := null;
  end if;

  update public.care_store_disputes
     set status = p_status, amount_cents = v_amount, resolution_note = nullif(btrim(coalesce(p_note, '')), ''),
         resolved_at = now(), updated_at = now()
   where id = d.id;
end;
$$;

revoke all on function public.care_store_open_dispute(uuid, text, text) from public, anon;
revoke all on function public.care_store_dispute_message(uuid, text) from public, anon;
revoke all on function public.care_store_dispute_withdraw(uuid) from public, anon;
revoke all on function public.care_store_dispute_resolve(uuid, text, integer, text) from public, anon;
grant execute on function public.care_store_open_dispute(uuid, text, text) to authenticated;
grant execute on function public.care_store_dispute_message(uuid, text) to authenticated;
grant execute on function public.care_store_dispute_withdraw(uuid) to authenticated;
grant execute on function public.care_store_dispute_resolve(uuid, text, integer, text) to authenticated;
