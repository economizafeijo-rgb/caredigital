# Disputas e devoluções de pedidos — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cliente abre disputa em pedido próprio; dono da loja responde e registra a resolução (devolução, reembolso total, parcial ou recusa); administrador vê em modo leitura.

**Architecture:** Duas tabelas (`care_store_disputes`, `care_store_dispute_messages`) com RLS; toda escrita de status passa por funções `security definer` que checam o papel de quem chama. Regras puras (janela, validação de reembolso, rótulos) ficam em `src/lib/disputes.ts`, testadas com Vitest. UI em três pontos: acompanhamento do pedido (cliente), nova aba "Disputas" no painel do lojista (dono), seção somente leitura na ficha da loja do administrador.

**Tech Stack:** React 18, TypeScript, Supabase (Postgres, RLS, plpgsql), Vitest, Tailwind, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-21-disputas-devolucoes-design.md`

## Global Constraints

- Janela para abrir disputa: 30 dias a partir de `care_store_orders.created_at`.
- Pedido com status `cancelado` não aceita disputa.
- Motivos aceitos: `produto_diferente`, `defeito`, `nao_entregue`, `desistencia`, `outro`.
- Descrição: mínimo 10 caracteres, máximo 1000.
- Mensagem: mínimo 1, máximo 1000 caracteres.
- Status de disputa: `aberta`, `reembolso_total`, `reembolso_parcial`, `devolucao_aceita`, `recusada`, `desistida`.
- Uma disputa aberta por pedido (índice único parcial).
- Reembolso parcial: valor maior que zero e menor ou igual ao total do pedido.
- Nenhuma escrita direta de status pelo cliente ou dono; só pelas funções.
- Administrador: somente leitura.

## Review Focus

- Pedido com 30 dias exatos na fronteira da janela: abre no dia 30, bloqueia no dia 31.
- Reembolso parcial igual ao total do pedido: aceito; acima do total: recusado.
- Cliente tentando abrir disputa em pedido de outra pessoa: recusado pelo banco.
- Segunda disputa no mesmo pedido enquanto a primeira está aberta: recusada pelo banco.
- Mensagem vazia ou com espaços: recusada antes de enviar.

## File Structure

- Create: `supabase/migrations/20261121060000_store_disputes.sql` — tabelas, índices, RLS e funções.
- Create: `src/lib/disputes.ts` — regras puras e rótulos.
- Create: `src/lib/disputes.test.ts` — testes das regras.
- Create: `src/components/vigia/store/DisputePanel.tsx` — abrir disputa, thread e desistir (cliente).
- Modify: `src/components/vigia/store/OrderTracking.tsx` — monta `DisputePanel` no pedido.
- Create: `src/components/vigia/seller/SellerDisputes.tsx` — lista, thread e resolução (dono).
- Modify: `src/components/vigia/seller/SellerDashboard.tsx` — tipo `SellerTab`, entrada `disputas` no menu (só dono), badge.
- Modify: `src/components/vigia/AdminVendorDetail.tsx` — seção "Disputas" somente leitura.

## Interfaces (cross-task)

`src/lib/disputes.ts` produces:
- `type DisputeStatus = "aberta" | "reembolso_total" | "reembolso_parcial" | "devolucao_aceita" | "recusada" | "desistida"`
- `type DisputeReason = "produto_diferente" | "defeito" | "nao_entregue" | "desistencia" | "outro"`
- `type Dispute = { id: string; order_id: string; vendor_id: string; user_id: string; reason: DisputeReason; description: string; status: DisputeStatus; amount_cents: number | null; resolution_note: string | null; created_at: string; updated_at: string; resolved_at: string | null }`
- `type DisputeMessage = { id: string; dispute_id: string; author: "cliente" | "lojista"; body: string; created_at: string }`
- `canOpenDispute(orderCreatedAt: string, orderStatus: string, now: Date): { ok: true } | { ok: false; reason: string }`
- `validateDescription(text: string): string | null` — erro ou null
- `validateRefund(totalCents: number, type: "reembolso_total" | "reembolso_parcial" | "devolucao_aceita" | "recusada", amountCents: number | null): string | null`
- `disputeStatusLabel(status: DisputeStatus): string`
- `disputeReasonLabel(reason: DisputeReason): string`
- `DISPUTE_WINDOW_DAYS = 30`

DB functions produced by Task 1 (names and parameters used by Tasks 3 and 4):
- `care_store_open_dispute(p_order uuid, p_reason text, p_description text) returns uuid`
- `care_store_dispute_message(p_dispute uuid, p_body text) returns void`
- `care_store_dispute_withdraw(p_dispute uuid) returns void`
- `care_store_dispute_resolve(p_dispute uuid, p_status text, p_amount_cents integer, p_note text) returns void` — only the owner

---

### Task 1: Migração do banco

**Files:**
- Create: `supabase/migrations/20261121060000_store_disputes.sql`

**Interfaces:**
- Produces: tables and functions listed above.

- [ ] **Step 1: Escrever o SQL**

Conteúdo, nesta ordem:
1. `create table care_store_disputes` com as colunas do Interface (`id uuid pk default gen_random_uuid()`, `order_id uuid not null references care_store_orders(id) on delete cascade`, `vendor_id uuid not null references care_store_vendors(id) on delete cascade`, `user_id uuid not null`, `reason text not null check (reason in (...5 motivos))`, `description text not null check (char_length(btrim(description)) between 10 and 1000)`, `status text not null default 'aberta' check (status in (...6 status))`, `amount_cents integer check (amount_cents is null or amount_cents >= 0)`, `resolution_note text`, `created_at`, `updated_at`, `resolved_at timestamptz`).
2. Índice único parcial: `create unique index care_store_disputes_open_idx on care_store_disputes(order_id) where status = 'aberta';`
3. `create table care_store_dispute_messages` (`id`, `dispute_id references care_store_disputes on delete cascade`, `author text check (author in ('cliente','lojista'))`, `body text check (char_length(btrim(body)) between 1 and 1000)`, `created_at`).
4. `alter table ... enable row level security` nas duas.
5. `revoke insert, update, delete` das duas de `authenticated, anon`; `grant select` às duas para `authenticated`.
6. Políticas de select:
   - disputas: `user_id = auth.uid() or exists (vendor owner) or public.is_nextvita_platform_admin()`.
   - mensagens: `exists (select 1 from care_store_disputes d where d.id = dispute_id and (d.user_id = auth.uid() or vendor owner or admin))`.
7. Função `care_store_open_dispute(p_order, p_reason, p_description)`: `security definer`, `set search_path = public, pg_temp`. Checa `auth.uid()`; carrega o pedido; exige `o.user_id = auth.uid()`; exige `status <> 'cancelado'`; exige `now() <= created_at + interval '30 days'`; `reason` e `description` validados; insere com `vendor_id = o.vendor_id`, `status = 'aberta'`; retorna o id. Erro de índice único vira "Já existe uma disputa aberta para este pedido".
8. Função `care_store_dispute_message(p_dispute, p_body)`: checa autor — se `auth.uid()` é dono da loja, `lojista`; se é `user_id` da disputa, `cliente`; senão erro. Exige `status = 'aberta'`. Insere a mensagem (corpo com `btrim`).
9. Função `care_store_dispute_withdraw(p_dispute)`: só o cliente, só se `aberta`; `status = 'desistida'`, `resolved_at = now()`.
10. Função `care_store_dispute_resolve(p_dispute, p_status, p_amount_cents, p_note)`: só o dono (`owner_id = auth.uid()`), só se `aberta`; `p_status in ('reembolso_total','reembolso_parcial','devolucao_aceita','recusada')`; para `reembolso_parcial` exige `p_amount_cents > 0` e `<= total do pedido`; para `reembolso_total` define `amount_cents` = total do pedido; para os demais, `amount_cents` null; grava `resolution_note`, `resolved_at = now()`, `updated_at = now()`.
11. Revogar execute de `public` e `anon` e conceder a `authenticated` nas 4 funções.

- [ ] **Step 2: Verificar que o arquivo compila**

Run: `grep -c "create or replace function public.care_store_" supabase/migrations/20261121060000_store_disputes.sql`
Expected: `4`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261121060000_store_disputes.sql
git commit -m "Adiciona disputas e devoluções de pedidos ao banco"
```

Aplicação: o usuário roda o arquivo no SQL Editor depois do merge; a verificação real vem pela API pública (ver Task 6).

---

### Task 2: Regras puras com testes

**Files:**
- Create: `src/lib/disputes.test.ts`
- Create: `src/lib/disputes.ts`

**Interfaces:**
- Produces: as funções e tipos listados em "Interfaces".

- [ ] **Step 1: Escrever os testes que falham**

Casos mínimos (use `describe`/`it` do Vitest, como nos outros `.test.ts` do projeto):
- `canOpenDispute`: pedido criado há 30 dias exatos e status `entregue` → ok; há 30 dias e 1 minuto → erro com "prazo"; status `cancelado` → erro.
- `validateDescription`: `"curto"` → erro; `"   dez letras  "` (10+ depois do trim) → null; string com 1001 caracteres → erro.
- `validateRefund(10000, "reembolso_parcial", 10000)` → null; `(10000, "reembolso_parcial", 10001)` → erro; `(10000, "reembolso_parcial", 0)` → erro; `(10000, "reembolso_parcial", null)` → erro; `(10000, "reembolso_total", null)` → null; `(10000, "recusada", null)` → null.
- `disputeStatusLabel("aberta")` → "Aguardando a loja"; `disputeReasonLabel("nao_entregue")` → "Não recebi o pedido".

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/disputes.test.ts`
Expected: FAIL (módulo não existe)

- [ ] **Step 3: Implementar `src/lib/disputes.ts`**

Exporta os tipos, `DISPUTE_WINDOW_DAYS = 30`, e as funções da seção Interfaces. `canOpenDispute` compara `now.getTime() - new Date(createdAt).getTime()` com `30 * 86_400_000`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/disputes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/disputes.ts src/lib/disputes.test.ts
git commit -m "Adiciona regras de disputas e devoluções com testes"
```

---

### Task 3: Painel do cliente

**Files:**
- Create: `src/components/vigia/store/DisputePanel.tsx`
- Modify: `src/components/vigia/store/OrderTracking.tsx` (montar `<DisputePanel orderId={order.id} orderStatus={order.status} createdAt={order.created_at} />` abaixo do resumo do pedido, quando o usuário logado é o dono do pedido)

**Interfaces:**
- Consumes: `canOpenDispute`, `validateDescription`, `disputeReasonLabel`, `disputeStatusLabel`, tipos de `src/lib/disputes.ts`; RPCs `care_store_open_dispute`, `care_store_dispute_message`, `care_store_dispute_withdraw`.
- Produces: `DisputePanel({ orderId, orderStatus, createdAt }: {...})`.

- [ ] **Step 1: Estado e carga**

Ao montar, busca `care_store_disputes` filtrando por `order_id` (RLS já limita ao cliente) e, se houver, as mensagens em `care_store_dispute_messages` ordenadas por `created_at`. Se não há disputa e `canOpenDispute` ok, mostra o formulário; senão mostra o motivo.

- [ ] **Step 2: Formulário de abertura**

Select de motivo (rótulos de `disputeReasonLabel`), textarea de descrição, validação com `validateDescription` antes de chamar `care_store_open_dispute`. Erro do banco mostrado em texto, sem detalhes técnicos.

- [ ] **Step 3: Thread e envio**

Lista as mensagens (autor "Você" para `cliente`, "Loja" para `lojista`). Campo de resposta com `validateDescription`-like para mensagem: mínimo 1 caractere após trim; chama `care_store_dispute_message`; recarrega.

- [ ] **Step 4: Desistir**

Botão "Desistir da disputa" com `confirm` (`useDialog`), só com status `aberta`; chama `care_store_dispute_withdraw`.

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "DisputePanel|OrderTracking"`
Expected: nenhuma linha.

- [ ] **Step 6: Commit**

```bash
git add src/components/vigia/store/DisputePanel.tsx src/components/vigia/store/OrderTracking.tsx
git commit -m "Adiciona disputa no acompanhamento do pedido"
```

---

### Task 4: Aba de disputas do lojista

**Files:**
- Create: `src/components/vigia/seller/SellerDisputes.tsx`
- Modify: `src/components/vigia/seller/SellerDashboard.tsx` — adicionar `"disputas"` ao tipo `SellerTab`; entrada em `allNav` no grupo `operacao` com `label: "Disputas"` e `badge` com a contagem de `status === 'aberta'`; `allowed("disputas")` só quando `myRole === "dono"`; render `{tab === "disputas" && <SellerDisputes vendor={vendor} onChanged={refresh} />}`.

**Interfaces:**
- Consumes: `care_store_disputes`, `care_store_dispute_messages` (leitura), `care_store_dispute_message`, `care_store_dispute_resolve`; `validateRefund`, `disputeStatusLabel`, `disputeReasonLabel`.
- Produces: `SellerDisputes({ vendor, onChanged }: { vendor: Vendor; onChanged: () => void })`.

- [ ] **Step 1: Lista**

Lista das disputas da loja, abertas primeiro, com motivo, status e data. Carga em `care_store_disputes` filtrando `vendor_id`.

- [ ] **Step 2: Detalhe com thread**

Mensagens do cliente e da loja; campo de resposta (`care_store_dispute_message`).

- [ ] **Step 3: Resolver**

Radio com as quatro resoluções (reembolso total, reembolso parcial com campo de valor em reais, devolução aceita, recusar), nota interna opcional (máximo 1000). Antes de chamar, `validateRefund`. Confirmação com `confirm` (texto: "Esta resolução é final e não pode ser desfeita."). Chama `care_store_dispute_resolve` com o valor em centavos. Ao sucesso, `onChanged()`.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "SellerDisputes|SellerDashboard"`
Expected: nenhuma linha.

- [ ] **Step 5: Commit**

```bash
git add src/components/vigia/seller/SellerDisputes.tsx src/components/vigia/seller/SellerDashboard.tsx
git commit -m "Adiciona aba de disputas no painel do lojista"
```

---

### Task 5: Visão somente leitura do administrador

**Files:**
- Modify: `src/components/vigia/AdminVendorDetail.tsx` — seção "Disputas da loja" logo após a seção de faturamento, listando as disputas da loja (status, motivo, data) sem botões de ação.

**Interfaces:**
- Consumes: `care_store_disputes` (leitura, RLS admin), `disputeStatusLabel`, `disputeReasonLabel`.

- [ ] **Step 1: Carregar e listar**

Adiciona consulta em `load()` com `.eq("vendor_id", vendor.id)` e renderiza uma `<section aria-label="Disputas">` com a lista. Sem botões.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep AdminVendorDetail`
Expected: nenhuma linha nova além das já existentes (`no-explicit-any` não entra no tsc).

- [ ] **Step 3: Commit**

```bash
git add src/components/vigia/AdminVendorDetail.tsx
git commit -m "Mostra disputas da loja na ficha do administrador"
```

---

### Task 6: Verificação final

- [ ] **Step 1: Testes e formatação**

Run: `npx vitest run src/lib/disputes.test.ts && npx prettier --check src/lib/disputes.ts src/lib/disputes.test.ts src/components/vigia/store/DisputePanel.tsx src/components/vigia/seller/SellerDisputes.tsx`
Expected: testes PASS; prettier "All matched files use Prettier code style!"

- [ ] **Step 2: Verificar que as funções existem após aplicar a migração**

Run (com a chave pública do cliente, sem login):
`curl -s -X POST "https://stlypzsqpqvrfsewlktx.supabase.co/rest/v1/rpc/care_store_dispute_resolve" -H "apikey: <chave>" -H "Authorization: Bearer <chave>" -H "Content-Type: application/json" -d '{"p_dispute":"00000000-0000-0000-0000-000000000000","p_status":"recusada","p_amount_cents":null,"p_note":null}'`
Expected: erro `42501` ("permission denied"), não `PGRST202`. Isso confirma que a função existe.

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-review

- Cobertura: cliente abre, conversa e desiste (Task 3); dono resolve (Task 4); administrador só lê (Task 5); janela, motivos, uma disputa por pedido e validações (Tasks 1–2); reembolso só registrado (Task 4, nota no texto).
- Consistência: nomes das funções e status são os mesmos em Task 1, 2, 3 e 4.
- Pendente de decisão do usuário: nenhuma para esta versão.
