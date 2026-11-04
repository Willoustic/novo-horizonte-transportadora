# 09 - Tela de Parametros

## Acesso

Somente perfil admin

## Grupos de Parametros

| Grupo                   | Campos                                             |
| ----------------------- | -------------------------------------------------- |
| Vibra                   | login, senha, URL do portal, email (2FA)           |
| Gmail                   | email, senha de app, IMAP host/porta               |
| WhatsApp (Fornecedores) | nome, telefone, fornecedor, combustiveis atendidos |
| Geral                   | extensivel - chave-valor criptografado             |

## Seguranca

- Valores sempre criptografados (AES-256)
- Chave de criptografia em env var PARAMS_SECRET
- Mascaramento na UI (****)
- Tabela Parametro: grupo, chave, valor (criptografado), descricao, atualizado_em
