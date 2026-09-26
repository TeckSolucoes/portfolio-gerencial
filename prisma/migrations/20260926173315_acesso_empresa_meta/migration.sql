-- CreateTable
CREATE TABLE "metas_mensais" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresa" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "atualizado_por" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "metas_mensais_empresa_mes_key" ON "metas_mensais"("empresa", "mes");

-- Só acrescenta colunas em users (sem recriar a tabela, para não arriscar os logins existentes).
ALTER TABLE "users" ADD COLUMN "empresas" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "escopo_gerente" TEXT;
