CREATE TABLE "permissoes_perfil" (
  "role" TEXT NOT NULL,
  "funcionalidade" TEXT NOT NULL,
  "permitido" BOOLEAN NOT NULL,
  "updated_at" DATETIME NOT NULL,
  PRIMARY KEY ("role", "funcionalidade")
);

CREATE TABLE "permissoes_usuario" (
  "user_id" TEXT NOT NULL,
  "funcionalidade" TEXT NOT NULL,
  "permitido" BOOLEAN NOT NULL,
  "updated_at" DATETIME NOT NULL,
  PRIMARY KEY ("user_id", "funcionalidade"),
  CONSTRAINT "permissoes_usuario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "custos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "periodicidade" TEXT NOT NULL,
  "valor_padrao_centavos" INTEGER NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_por" TEXT,
  "atualizado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE TABLE "custo_lancamentos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "custo_id" TEXT NOT NULL,
  "competencia" TEXT NOT NULL,
  "valor_centavos" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "pago_em" DATETIME,
  "observacao" TEXT,
  "criado_por" TEXT,
  "atualizado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "custo_lancamentos_custo_id_fkey" FOREIGN KEY ("custo_id") REFERENCES "custos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "custo_lancamentos_custo_id_competencia_key" ON "custo_lancamentos"("custo_id", "competencia");
CREATE INDEX "custo_lancamentos_competencia_status_idx" ON "custo_lancamentos"("competencia", "status");

INSERT INTO "permissoes_perfil" ("role", "funcionalidade", "permitido", "updated_at") VALUES
('superadmin','relatorio',true,CURRENT_TIMESTAMP),('gerente','relatorio',true,CURRENT_TIMESTAMP),('visualizador','relatorio',true,CURRENT_TIMESTAMP),
('superadmin','monitoramento',true,CURRENT_TIMESTAMP),('gerente','monitoramento',true,CURRENT_TIMESTAMP),('visualizador','monitoramento',true,CURRENT_TIMESTAMP),
('superadmin','diario_oficial',true,CURRENT_TIMESTAMP),('gerente','diario_oficial',true,CURRENT_TIMESTAMP),('visualizador','diario_oficial',true,CURRENT_TIMESTAMP),
('superadmin','transparencia',true,CURRENT_TIMESTAMP),('gerente','transparencia',false,CURRENT_TIMESTAMP),('visualizador','transparencia',false,CURRENT_TIMESTAMP),
('superadmin','custos',true,CURRENT_TIMESTAMP),('gerente','custos',true,CURRENT_TIMESTAMP),('visualizador','custos',true,CURRENT_TIMESTAMP),
('superadmin','metas',true,CURRENT_TIMESTAMP),('gerente','metas',false,CURRENT_TIMESTAMP),('visualizador','metas',false,CURRENT_TIMESTAMP),
('superadmin','workers',true,CURRENT_TIMESTAMP),('gerente','workers',false,CURRENT_TIMESTAMP),('visualizador','workers',false,CURRENT_TIMESTAMP);

INSERT INTO "custos" ("id","nome","descricao","periodicidade","valor_padrao_centavos","ativo","created_at","updated_at") VALUES
('custo-claude-inicial','Claude','Assistente de IA usado no apoio ao desenvolvimento.','unico',13000,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('custo-codex-inicial','Codex','Assistente de IA usado no desenvolvimento e na manutenção.','unico',13000,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('custo-wapi-inicial','W-API','Serviço usado na operação de comunicação por WhatsApp.','unico',6000,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT INTO "custo_lancamentos" ("id","custo_id","competencia","valor_centavos","status","observacao","created_at","updated_at") VALUES
('lanc-claude-2026-09','custo-claude-inicial','2026-09',13000,'pago','Custo inicial já pago.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('lanc-codex-2026-09','custo-codex-inicial','2026-09',13000,'pago','Custo inicial já pago.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('lanc-wapi-2026-09','custo-wapi-inicial','2026-09',6000,'pago','Custo inicial já pago.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
