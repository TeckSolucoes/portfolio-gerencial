-- Mapeamento mensal do Portal da Transparência: só cria tabelas novas (aditiva).
-- CreateTable
CREATE TABLE "portal_meses" (
    "mes" TEXT NOT NULL PRIMARY KEY,
    "total_servidores" INTEGER NOT NULL,
    "entraram" INTEGER NOT NULL,
    "ja_clientes" INTEGER NOT NULL,
    "acionaveis" INTEGER NOT NULL,
    "ignoradas" INTEGER NOT NULL,
    "processado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "portal_novos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mes" TEXT NOT NULL,
    "servidor_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf6" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "orgao_superior" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "situacao" TEXT NOT NULL,
    "ingresso_cargo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "chave" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "base_clientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "origem" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "base_importacoes" (
    "origem" TEXT NOT NULL PRIMARY KEY,
    "arquivo" TEXT NOT NULL,
    "linhas" INTEGER NOT NULL,
    "ignoradas" INTEGER NOT NULL,
    "importado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importado_por" TEXT
);

-- CreateIndex
CREATE INDEX "portal_novos_chave_idx" ON "portal_novos"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "portal_novos_mes_servidor_id_key" ON "portal_novos"("mes", "servidor_id");

-- CreateIndex
CREATE INDEX "base_clientes_chave_idx" ON "base_clientes"("chave");

-- CreateIndex
CREATE INDEX "base_clientes_origem_idx" ON "base_clientes"("origem");

