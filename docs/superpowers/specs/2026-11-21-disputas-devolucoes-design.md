# Disputas e devoluções de pedidos — desenho

Data: 2026-11-21 · Status: aguardando aprovação

## Intenção e porquê

Hoje um pedido só tem status (pago, enviado, entregue, cancelado). Quando o cliente recebe algo errado, com defeito ou não recebe, não há como registrar o problema nem responder a ele dentro do sistema. A loja precisa de um lugar único para receber a reclamação, conversar com o cliente, decidir a devolução ou o reembolso e deixar o registro guardado.

## Quem decide

- **Cliente:** abre a disputa a partir do próprio pedido, conversa com a loja e pode desistir.
- **Dono da loja:** é o único que responde, decide e registra a resolução (devolução, reembolso total, reembolso parcial ou recusa).
- **Administrador da plataforma:** vê as disputas em modo leitura, para acompanhamento. Não resolve nada.
- **Funcionários:** não acessam disputas nesta versão.

## Escopo (versão 1)

- Cliente abre disputa em pedido pago ou em andamento, em até 30 dias da compra, com motivo e descrição (mínimo de 10 caracteres). Uma disputa aberta por pedido.
- Troca de mensagens entre cliente e loja dentro da disputa.
- Dono registra a resolução: devolução aceita, reembolso total, reembolso parcial (com valor) ou recusa. Pode fechar a disputa com uma nota interna.
- Cliente pode desistir enquanto a disputa estiver aberta.
- Lista de disputas no painel do lojista, com contador de abertas.

## Fora do escopo (versão 1)

- Devolução do dinheiro pelo meio de pagamento. Não há integração de pagamento no sistema, então o reembolso é só registrado. O lojista devolve o valor por fora e marca como feito.
- Fotos e anexos na reclamação.
- Mediação do administrador (resolver ou reabrir).
- Ajuste automático da comissão da NextVita quando há reembolso.
- Notificações por e-mail ou WhatsApp.

## Modelo de dados

- `care_store_disputes`: id, order_id (único entre disputas abertas), vendor_id, user_id (cliente), reason, description, status (`aberta`, `reembolso_total`, `reembolso_parcial`, `devolucao_aceita`, `recusada`, `desistida`), amount_cents (quando parcial), resolution_note, created_at, updated_at, resolved_at.
- `care_store_dispute_messages`: id, dispute_id, author (`cliente` ou `lojista`), body (até 1000 caracteres), created_at.

## Permissões (RLS)

- Cliente: cria disputa só em pedido próprio; lê as próprias disputas e mensagens; pode desistir (status `desistida`) enquanto aberta; envia mensagem enquanto aberta.
- Dono da loja: lê e atualiza as disputas da própria loja; envia mensagem; registra a resolução.
- Administrador: lê todas as disputas e mensagens.
- Regras de escrita de status feitas por função `security definer` que valida o papel de quem chama.

## Regras de negócio

- Janela: 30 dias a partir de `created_at` do pedido.
- Pedido cancelado não aceita disputa.
- Reembolso parcial exige valor maior que zero e não maior que o total do pedido.
- A resolução é final nesta versão; reabrir exige novo pedido de apoio fora do sistema.

## Interface

- Cliente: botão "Abrir disputa" na tela de acompanhamento do pedido; lista "Minhas disputas" na área de pedidos.
- Lojista: nova aba "Disputas" no painel com contador; detalhe com thread, botões de resolução e confirmação antes de encerrar.

## Riscos e pontos em aberto

- Reembolso só registrado: o dono precisa devolver o valor por conta própria.
- Comissão não é ajustada automaticamente; pode gerar diferença na cobrança mensal.
- Prazo de 30 dias é uma escolha minha; pode ser ajustado.
