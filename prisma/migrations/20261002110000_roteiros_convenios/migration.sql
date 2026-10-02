CREATE TABLE "roteiros_convenios" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "regras_json" TEXT NOT NULL DEFAULT '[]',
  "observacoes" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_por" TEXT,
  "atualizado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "roteiros_convenios_nome_key" ON "roteiros_convenios"("nome");

INSERT INTO "roteiros_convenios" (
  "id", "nome", "descricao", "regras_json", "observacoes", "ativo", "created_at", "updated_at"
) VALUES (
  'siape-inicial',
  'SIAPE',
  'Servidores públicos federais',
  '[{"campo":"Regime jurídico","valor":"A definir"},{"campo":"Valor mínimo da parcela","valor":"A definir"},{"campo":"Idade","valor":"A definir"},{"campo":"Situação funcional","valor":"A definir"},{"campo":"Cedido","valor":"A definir"},{"campo":"Cedido requisitado","valor":"A definir"},{"campo":"Pensão temporária","valor":"A definir"}]',
  'Roteiro inicial criado para receber as regras oficiais da operação.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

DELETE FROM "permissoes_perfil" WHERE "funcionalidade" = 'relatorio_supervisao';
DELETE FROM "permissoes_usuario" WHERE "funcionalidade" = 'relatorio_supervisao';

INSERT INTO "permissoes_perfil" ("role", "funcionalidade", "permitido", "updated_at") VALUES
('superadmin', 'roteiros', true, CURRENT_TIMESTAMP),
('gerente', 'roteiros', false, CURRENT_TIMESTAMP),
('visualizador', 'roteiros', false, CURRENT_TIMESTAMP)
ON CONFLICT("role", "funcionalidade") DO NOTHING;
