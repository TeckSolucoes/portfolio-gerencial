CREATE TABLE "whatsapp_config" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "instance_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "destinatarios" TEXT NOT NULL,
  "empresas" TEXT NOT NULL,
  "atualizado_por" TEXT,
  "updated_at" DATETIME NOT NULL
);

INSERT INTO "permissoes_perfil" ("role", "funcionalidade", "permitido", "updated_at") VALUES
('superadmin', 'whatsapp', true, CURRENT_TIMESTAMP),
('gerente', 'whatsapp', false, CURRENT_TIMESTAMP),
('visualizador', 'whatsapp', false, CURRENT_TIMESTAMP)
ON CONFLICT("role", "funcionalidade") DO NOTHING;
