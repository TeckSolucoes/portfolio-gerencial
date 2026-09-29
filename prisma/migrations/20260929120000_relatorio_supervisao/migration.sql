INSERT INTO "permissoes_perfil" ("role", "funcionalidade", "permitido", "updated_at") VALUES
('superadmin', 'relatorio_supervisao', true, CURRENT_TIMESTAMP),
('gerente', 'relatorio_supervisao', false, CURRENT_TIMESTAMP),
('visualizador', 'relatorio_supervisao', false, CURRENT_TIMESTAMP)
ON CONFLICT("role", "funcionalidade") DO NOTHING;
