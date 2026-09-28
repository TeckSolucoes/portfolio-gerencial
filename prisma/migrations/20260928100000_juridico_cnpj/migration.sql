CREATE TABLE "juridico_empresas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cnpj" TEXT NOT NULL,
  "razao_social" TEXT NOT NULL,
  "nome_fantasia" TEXT,
  "situacao_cadastral" TEXT,
  "natureza_juridica" TEXT,
  "atividade_principal" TEXT,
  "municipio" TEXT,
  "uf" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_por" TEXT,
  "dados_atualizados_em" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "juridico_empresas_cnpj_key" ON "juridico_empresas"("cnpj");

CREATE TABLE "juridico_eventos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa_id" TEXT NOT NULL,
  "fonte" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "identificador" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "resumo" TEXT,
  "url" TEXT,
  "data_evento" DATETIME,
  "encontrado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "visto" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "juridico_eventos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "juridico_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "juridico_eventos_empresa_id_fonte_identificador_key" ON "juridico_eventos"("empresa_id", "fonte", "identificador");
CREATE INDEX "juridico_eventos_empresa_id_encontrado_em_idx" ON "juridico_eventos"("empresa_id", "encontrado_em");
CREATE INDEX "juridico_eventos_visto_encontrado_em_idx" ON "juridico_eventos"("visto", "encontrado_em");

CREATE TABLE "juridico_fontes_status" (
  "empresa_id" TEXT NOT NULL,
  "fonte" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "mensagem" TEXT,
  "consultado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("empresa_id", "fonte"),
  CONSTRAINT "juridico_fontes_status_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "juridico_empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "permissoes_perfil" ("role", "funcionalidade", "permitido", "updated_at") VALUES
('superadmin','juridico',true,CURRENT_TIMESTAMP),
('gerente','juridico',false,CURRENT_TIMESTAMP),
('visualizador','juridico',false,CURRENT_TIMESTAMP)
ON CONFLICT("role","funcionalidade") DO NOTHING;
