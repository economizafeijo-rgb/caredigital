# NextVita public signup and free onboarding design

## Intent

Abrir o cadastro do NextVita para qualquer visitante, sem cobrança, com confirmação obrigatória do e-mail antes do primeiro acesso. O cadastro inicial deve alimentar o prontuário pessoal e as métricas de saúde do próprio usuário.

## Goals

- Adicionar cadastro público à tela de entrada e um CTA de cadastro gratuito na página inicial.
- Coletar nome, e-mail, senha, confirmação de senha, CPF, celular, data de nascimento, peso e altura.
- Validar formato de e-mail, dígitos verificadores do CPF, telefone brasileiro e data de nascimento válida. Peso e altura terão limites numéricos plausíveis.
- Enviar confirmação por e-mail usando o fluxo nativo do Supabase Auth.
- Após a confirmação e o primeiro login, criar ou completar o perfil, paciente, acesso do próprio paciente e primeira medição corporal.
- Calcular o IMC inicial e deixar os dados disponíveis para as métricas já existentes.
- Exibir um banner público profissional e discreto, com chamada para uso gratuito da plataforma.

## Data model

- Criar uma tabela privada `care_identity_profiles` ligada a `auth.users`, com CPF normalizado e telefone normalizado, índice único para CPF e RLS somente para o próprio usuário.
- Acrescentar ou usar os campos existentes de telefone, data de nascimento, peso e altura em `care_patients`.
- O payload temporário de inscrição será enviado em `auth.signUp({ options: { data } })`. Esses metadados serão usados somente para concluir o primeiro acesso e não serão usados em autorização.
- O primeiro acesso fará upsert em `care_profiles`, criará `care_patients`, criará `care_patient_access` para o próprio usuário e inserirá a medição inicial em `care_body_measurements`.
- A rotina de bootstrap será idempotente. Repetir o login não duplicará paciente, acesso ou medição inicial.

## User flow

1. O visitante abre a home ou a tela de entrada.
2. O banner e o botão “Criar conta grátis” levam ao formulário público.
3. O formulário valida os dados localmente e chama `supabase.auth.signUp`.
4. A interface informa que o link de confirmação foi enviado e oferece retorno à tela de entrada.
5. O usuário confirma o e-mail.
6. No primeiro login, o sistema cria o prontuário pessoal e as métricas iniciais.
7. O usuário é encaminhado para `/cliente`.

## Banner

Usar um bloco responsivo na home, integrado à identidade teal do NextVita, com título curto, benefício direto, indicação de plataforma gratuita e CTA “Criar conta grátis”. O banner terá contraste suficiente, altura moderada e não substituirá o hero principal.

## Constraints

- Preservar o login, a recuperação de senha e os prontuários já existentes.
- Manter RLS ativado nas novas estruturas.
- Nunca usar CPF ou dados pessoais para decisões de autorização no JWT.
- Não publicar senha, chave secreta ou dados pessoais em logs.
- A confirmação de e-mail precisa estar habilitada no projeto Supabase e a URL de redirecionamento deve apontar para a rota de entrada.

## Verification

- Validar CPF com os dois dígitos verificadores, telefone brasileiro, e-mail e data futura.
- Testar cadastro com confirmação habilitada, confirmação, primeiro login e repetição do login.
- Testar conta existente, CPF duplicado, e-mail duplicado e dados inválidos.
- Executar lint, testes e build antes de publicar a alteração.
