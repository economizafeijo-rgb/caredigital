# CareDigital — GitHub/Lovable sync marker

Atualizações efetivamente enviadas para a branch `main` em 02/11/2026:

- Medicamentos: confirmação impedida antes do horário programado (interface e Supabase).
- Refeições: confirmação explícita para registrar antes do horário e confirmação obrigatória para excluir.
- Histórico: data e hora reais do servidor, com registro de exclusões.
- Bebidas e chás: cadastro pelo próprio cliente em Minha hidratação → Chás e bebidas.
- Banco de dados: migração `20261102020000_client_care_scheduling_beverages.sql` aplicada no projeto CareDigital.

Commit de integração verificado antes deste marcador: `d90ef195b5411c6166bd08371a4df787998a68d6`.
Verificações automáticas do GitHub Actions: **success**.

Este arquivo gera uma nova notificação de push para que o Lovable sincronize a branch `main`.
**A publicação da versão no site público é uma etapa separada**: verificar Lovable → GitHub sync e clicar em Publicar para atualizar a versão pública.

## Tentativa de recuperação de sincronização — 02/11/2026

- Commit do novo destaque visual: `16a8626e27505e11fd20273d1e5d696b2a8b1c75`.
- Arquivos do destaque: `src/components/vigia/ClientTodayTimeline.tsx` e `src/styles.css`.
- Novo push na branch `main` para reemitir o evento de sincronização GitHub → Lovable, conforme a documentação oficial de Git sync.
- Não foi executado reset, force push, nem exclusão das branches `lovable-sync`.
- Validar em Lovable: Project settings → Git → GitHub → branch ativa `main`, Sync status e build.
