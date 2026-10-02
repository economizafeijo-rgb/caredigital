# Primeiro administrador

1. Aplique as migrações do projeto Supabase.
2. Em **Authentication → Users**, crie/confirme a conta do administrador com o e-mail de acesso que ele controla. Defina a senha diretamente no painel da Supabase Auth; não grave senha, CPF ou token em arquivos do projeto.
3. Em **SQL Editor**, confira o `user_id` da conta e promova somente essa pessoa:

```sql
update public.professional_profiles
set role = 'platform_admin', is_active = true
where user_id = '<UUID_DO_USUARIO_AUTENTICADO>';
```

4. Publique a Edge Function `invite-professional` para habilitar convites de especialistas pelo painel.

O acesso do app usa e-mail e senha do Supabase Auth. CPF não é login nem é armazenado pelo projeto. Escolha uma senha longa e exclusiva em vez de uma senha numérica curta.

