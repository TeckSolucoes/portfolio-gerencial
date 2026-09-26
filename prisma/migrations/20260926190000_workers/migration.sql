-- CreateTable
CREATE TABLE "worker_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "intervalo_min" INTEGER,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "worker_execucoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worker_id" TEXT NOT NULL,
    "iniciado_em" DATETIME NOT NULL,
    "terminado_em" DATETIME,
    "status" TEXT NOT NULL,
    "itens" INTEGER,
    "mensagem" TEXT,
    "origem" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "worker_execucoes_worker_id_iniciado_em_idx" ON "worker_execucoes"("worker_id", "iniciado_em");
