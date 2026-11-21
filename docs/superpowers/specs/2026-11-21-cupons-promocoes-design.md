# Cupons e promoções da loja — desenho

Data: 2026-11-21 · Status: aguardando aprovação

## Situação atual

Não existe sistema de cupom. Há dois descontos hoje:
- Desconto fixo de 5% no Pix, igual para todas as lojas (`PIX_DISCOUNT` em `src/lib/store.ts`).
- Preço "de/por" por produto (`old_price_cents`), definido manualmente em cada item.

Além disso, o pedido é criado pelo navegador com o total já calculado (`total_cents` vem do cliente). Isso vale para qualquer desconto, então cupom precisa ser calculado no servidor.

## Intenção e porquê

O lojista quer criar ofertas para datas comemorativas (Dia das Mães, Natal, Black Friday) e outras ocasiões (aniversário da loja, volta às aulas), com código que o cliente digita, e promoções de preço em produtos escolhidos.

## Decisões propostas (para aprovar)

1. **Cupom com código:** o lojista cria o código (ex.: `MAE10`), define o desconto, o período, a ocasião e os limites. O cliente digita o código no carrinho.
2. **Promoção automática:** o lojista escolhe produtos e um percentual; dentro do período, o desconto aparece na vitrine e entra no carrinho sem código.
3. **Tipos de desconto:** percentual (de 1% a 90%) ou valor fixo em reais.
4. **Ocasiões prontas:** Dia das Mães, Dia dos Pais, Dia dos Namorados, Natal, Black Friday, Aniversário da loja, Volta às aulas e Personalizada. Cada uma sugere código e período, mas o lojista pode mudar tudo.
5. **Regras de cupom:** início e fim, valor mínimo do pedido, limite total de usos, limite de uso por cliente (padrão 1), e aplicação em toda a loja ou em produtos escolhidos.
6. **Cupom e promoção não se somam:** se o produto já estiver em promoção, o cupom vale sobre o preço promocional, mas só um cupom por pedido.
7. **Pausar ou encerrar:** cupom com uso não é apagado, só pausado ou encerrado. Assim o histórico do pedido continua correto.
8. **Quem cria:** só o dono da loja. Funcionários não criam nem editam cupons.

## Dados

- `care_store_coupons`: id, vendor_id, code (único por loja, maiúsculo), occasion, kind (`percent` ou `fixed`), value, starts_at, ends_at, min_order_cents, max_uses, uses_count, per_customer_limit, scope (`loja` ou `produtos`), product_ids, status (`ativo`, `pausado`, `encerrado`).
- `care_store_promotions`: id, vendor_id, name, occasion, percent, starts_at, ends_at, product_ids, status.
- `care_store_coupon_uses`: coupon_id, user_id, order_id, discount_cents, created_at.
- `care_store_orders`: novas colunas `coupon_code`, `discount_cents`, `subtotal_cents` (o total continua em `total_cents`).

## Servidor (o ponto de segurança)

- `care_store_quote_order(p_vendor, p_items, p_coupon, p_method)`: recalcula preços pelos valores do banco, aplica promoção e cupom, e devolve subtotal, desconto e total. O carrinho mostra essa resposta.
- `care_store_place_order(...)`: cria o pedido usando o mesmo cálculo do servidor e grava o uso do cupom na mesma transação. O total do pedido deixa de vir do navegador.
- Regras de validação: código existe e está ativo, dentro do período, pedido mínimo atingido, limite de usos e por cliente não estourado, produtos elegíveis.

## Interface

- Lojista: nova aba **Promoções** com dois blocos, Cupons e Promoções. Lista com ocasião, status, usos e valor gerado. Criação em formulário com as ocasiões prontas.
- Cliente: campo "Cupom" no carrinho com aplicar/remover, e o desconto aparece na linha de total.
- Pedido: o dono vê o código usado e o desconto na ficha do pedido.

## Fora do escopo (versão 1)

- Cupom de frete grátis.
- Cupom combinado com o desconto do Pix (o Pix continua valendo por último, sobre o total).
- Envio do cupom por WhatsApp ou e-mail.
- Relatório de campanhas com comparação entre ocasiões.

## Riscos

- Mudar a criação do pedido para o servidor é a parte mais sensível. Sem isso, cupom pode ser burlado alterando o valor no navegador.
- Desconto de promoção sobre produto com preço "de/por" precisa de regra clara de qual preço vale. Proposta: o menor entre o preço promocional e o preço atual.
