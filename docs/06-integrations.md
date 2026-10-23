# 06 - Integracoes Externas

## Vibra (Portal Web)
- Sem API oficial
- Scraping semi-automatico (Puppeteer/Playwright) com login + 2FA por email
- Fallback: entrada manual sempre disponivel
- Fase 2 (apos MVP de 7 dias)

## WhatsApp
- Mensagens chegam em conversas privadas
- MVP: operador cola mensagem -> parser extrai dados -> aprovacao manual
- Fase 2: WhatsApp Business API (webhook automatico)

## Planilhas
- Importacao one-time de XLSX/CSV (Fase 2)
- Exportacao para Excel mantida (sempre disponivel)

## Gmail (para 2FA Vibra)
- Leitura de caixa de entrada via IMAP
- Extração de codigo de verificacao por regex
- Senha de app armazenada criptografada
