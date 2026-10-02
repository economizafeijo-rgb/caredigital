# Primeiro administrador

1. No terminal do projeto, autentique e aplique as migrações:

```sh
npx supabase login
npx supabase link --project-ref vvonjcrpwjaujkugogem
npx supabase db push
npx supabase functions deploy invite-professional
```

O deploy da função usa os secrets padrão do projeto Supabase; não coloque a service-role key no navegador nem no repositório.

2. Em **Authentication → Users**, crie/confirme a conta do administrador com o e-mail de acesso que ele controla. Defina a senha diretamente no painel da Supabase Auth; não grave senha, CPF ou token em arquivos do projeto.
3. Em **SQL Editor**, confira o `user_id` da conta e promova somente essa pessoa:

```sql
update public.professional_profiles
set role = 'platform_admin', is_active = true
where user_id = '<UUID_DO_USUARIO_AUTENTICADO>';
```

O acesso do app usa e-mail e senha do Supabase Auth. CPF não é login nem é armazenado pelo projeto. Escolha uma senha longa e exclusiva em vez de uma senha numérica curta.

