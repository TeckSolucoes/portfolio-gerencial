CREATE TABLE "gerentes_comerciais" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "nome_normalizado" TEXT NOT NULL,
  "codigo_externo" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_por" TEXT,
  "atualizado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE INDEX "gerentes_comerciais_empresa_nome_normalizado_idx" ON "gerentes_comerciais"("empresa", "nome_normalizado");
CREATE UNIQUE INDEX "gerentes_comerciais_empresa_codigo_externo_key" ON "gerentes_comerciais"("empresa", "codigo_externo");
CREATE INDEX "gerentes_comerciais_empresa_ativo_idx" ON "gerentes_comerciais"("empresa", "ativo");

ALTER TABLE "users" ADD COLUMN "gerente_comercial_id" TEXT REFERENCES "gerentes_comerciais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "users_gerente_comercial_id_idx" ON "users"("gerente_comercial_id");

CREATE TABLE "equipes_comerciais" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "nome_normalizado" TEXT NOT NULL,
  "codigo_externo" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_por" TEXT,
  "atualizado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE INDEX "equipes_comerciais_empresa_nome_normalizado_idx" ON "equipes_comerciais"("empresa", "nome_normalizado");
CREATE UNIQUE INDEX "equipes_comerciais_empresa_codigo_externo_key" ON "equipes_comerciais"("empresa", "codigo_externo");
CREATE INDEX "equipes_comerciais_empresa_ativo_idx" ON "equipes_comerciais"("empresa", "ativo");

CREATE TABLE "vendedores_comerciais" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "nome_normalizado" TEXT NOT NULL,
  "codigo_externo" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_por" TEXT,
  "atualizado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE INDEX "vendedores_comerciais_empresa_nome_normalizado_idx" ON "vendedores_comerciais"("empresa", "nome_normalizado");
CREATE UNIQUE INDEX "vendedores_comerciais_empresa_codigo_externo_key" ON "vendedores_comerciais"("empresa", "codigo_externo");
CREATE INDEX "vendedores_comerciais_empresa_ativo_idx" ON "vendedores_comerciais"("empresa", "ativo");

CREATE TABLE "vinculos_equipe_gerente" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "equipe_id" TEXT NOT NULL,
  "gerente_id" TEXT NOT NULL,
  "inicio" DATETIME NOT NULL,
  "fim" DATETIME,
  "criado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vinculos_equipe_gerente_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes_comerciais" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "vinculos_equipe_gerente_gerente_id_fkey" FOREIGN KEY ("gerente_id") REFERENCES "gerentes_comerciais" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "vinculos_equipe_gerente_equipe_id_inicio_fim_idx" ON "vinculos_equipe_gerente"("equipe_id", "inicio", "fim");
CREATE INDEX "vinculos_equipe_gerente_gerente_id_inicio_fim_idx" ON "vinculos_equipe_gerente"("gerente_id", "inicio", "fim");

CREATE TABLE "vinculos_vendedor_equipe" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vendedor_id" TEXT NOT NULL,
  "equipe_id" TEXT NOT NULL,
  "inicio" DATETIME NOT NULL,
  "fim" DATETIME,
  "criado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vinculos_vendedor_equipe_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores_comerciais" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "vinculos_vendedor_equipe_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes_comerciais" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "vinculos_vendedor_equipe_vendedor_id_inicio_fim_idx" ON "vinculos_vendedor_equipe"("vendedor_id", "inicio", "fim");
CREATE INDEX "vinculos_vendedor_equipe_equipe_id_inicio_fim_idx" ON "vinculos_vendedor_equipe"("equipe_id", "inicio", "fim");

CREATE TABLE "aliases_hierarquia" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "origem" TEXT NOT NULL,
  "valor" TEXT NOT NULL,
  "valor_normalizado" TEXT NOT NULL,
  "gerente_id" TEXT,
  "equipe_id" TEXT,
  "vendedor_id" TEXT,
  "criado_por" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aliases_hierarquia_gerente_id_fkey" FOREIGN KEY ("gerente_id") REFERENCES "gerentes_comerciais" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "aliases_hierarquia_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes_comerciais" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "aliases_hierarquia_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores_comerciais" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "aliases_hierarquia_destino_check" CHECK (
    ("tipo" = 'gerente' AND "gerente_id" IS NOT NULL AND "equipe_id" IS NULL AND "vendedor_id" IS NULL)
    OR ("tipo" = 'equipe' AND "gerente_id" IS NULL AND "equipe_id" IS NOT NULL AND "vendedor_id" IS NULL)
    OR ("tipo" = 'vendedor' AND "gerente_id" IS NULL AND "equipe_id" IS NULL AND "vendedor_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "aliases_hierarquia_empresa_tipo_origem_valor_normalizado_key" ON "aliases_hierarquia"("empresa", "tipo", "origem", "valor_normalizado");
CREATE INDEX "aliases_hierarquia_gerente_id_idx" ON "aliases_hierarquia"("gerente_id");
CREATE INDEX "aliases_hierarquia_equipe_id_idx" ON "aliases_hierarquia"("equipe_id");
CREATE INDEX "aliases_hierarquia_vendedor_id_idx" ON "aliases_hierarquia"("vendedor_id");

CREATE TABLE "itens_sem_vinculo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "origem" TEXT NOT NULL,
  "valor_original" TEXT NOT NULL,
  "valor_normalizado" TEXT NOT NULL,
  "ocorrencias" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "primeiro_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimo_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvido_em" DATETIME,
  "resolvido_por" TEXT
);

CREATE UNIQUE INDEX "itens_sem_vinculo_empresa_tipo_origem_valor_normalizado_key" ON "itens_sem_vinculo"("empresa", "tipo", "origem", "valor_normalizado");
CREATE INDEX "itens_sem_vinculo_status_ultimo_em_idx" ON "itens_sem_vinculo"("status", "ultimo_em");

INSERT INTO "permissoes_perfil" ("role", "funcionalidade", "permitido", "updated_at") VALUES
('superadmin', 'hierarquia', true, CURRENT_TIMESTAMP),
('gerente', 'hierarquia', false, CURRENT_TIMESTAMP),
('visualizador', 'hierarquia', false, CURRENT_TIMESTAMP)
ON CONFLICT("role", "funcionalidade") DO NOTHING;
