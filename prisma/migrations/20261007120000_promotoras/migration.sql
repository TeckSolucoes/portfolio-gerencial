CREATE TABLE "promotoras" (
 "id" TEXT NOT NULL PRIMARY KEY, "empresa" TEXT NOT NULL, "nome" TEXT NOT NULL,
 "cnpj" TEXT, "codigo" TEXT, "origem" TEXT NOT NULL DEFAULT 'manual', "ativo" BOOLEAN NOT NULL DEFAULT true,
 "gerente_comercial_id" TEXT, "criado_por" TEXT NOT NULL, "atualizado_por" TEXT NOT NULL,
 "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL,
 CONSTRAINT "promotoras_gerente_comercial_id_fkey" FOREIGN KEY ("gerente_comercial_id") REFERENCES "gerentes_comerciais" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "promotoras_empresa_ativo_idx" ON "promotoras"("empresa", "ativo");
CREATE INDEX "promotoras_gerente_comercial_id_idx" ON "promotoras"("gerente_comercial_id");
CREATE TABLE "historico_promotoras" (
 "id" TEXT NOT NULL PRIMARY KEY, "promotora_id" TEXT NOT NULL, "autor" TEXT NOT NULL,
 "resumo" TEXT NOT NULL, "anterior" JSONB, "posterior" JSONB NOT NULL, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "historico_promotoras_promotora_id_fkey" FOREIGN KEY ("promotora_id") REFERENCES "promotoras" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "historico_promotoras_promotora_id_created_at_idx" ON "historico_promotoras"("promotora_id", "created_at");
CREATE UNIQUE INDEX "promotoras_empresa_origem_codigo_key" ON "promotoras"("empresa", "origem", "codigo");
