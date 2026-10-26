-- 006_imap_params.sql
-- Seed IMAP parameters for Vibra email parser (password must be encrypted before insert via app)
-- Run the INSERT for password manually after encrypting, or use the Parâmetros UI.

INSERT INTO parametros (grupo, chave, valor, descricao) VALUES
  ('imap', 'imap_host', 'imap.gmail.com', 'Host IMAP do e-mail que recebe preços Vibra'),
  ('imap', 'imap_port', '993', 'Porta IMAP (TLS)'),
  ('imap', 'imap_user', 'financeiro@postonovohorizonte.com', 'Usuário IMAP'),
  ('imap', 'imap_password', 'PLACEHOLDER_ENCRYPTED', 'Senha IMAP (criptografada via AES-256)'),
  ('imap', 'imap_folder', 'INBOX', 'Pasta IMAP a monitorar'),
  ('imap', 'vibra_email_sender', '', 'Remetente dos e-mails de preço Vibra'),
  ('imap', 'vibra_email_subject_filter', 'DETA', 'Filtro de assunto dos e-mails Vibra')
ON CONFLICT (grupo, chave) DO NOTHING;
