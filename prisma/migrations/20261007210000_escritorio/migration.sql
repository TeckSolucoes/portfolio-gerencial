CREATE TABLE "escritorio_presencas" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "nome" TEXT NOT NULL, "sala" TEXT NOT NULL, "visto_em" DATETIME NOT NULL);
CREATE INDEX "escritorio_presencas_visto_em_idx" ON "escritorio_presencas"("visto_em");
CREATE TABLE "escritorio_mensagens" ("id" TEXT NOT NULL PRIMARY KEY, "user_id" TEXT NOT NULL, "nome" TEXT NOT NULL, "sala" TEXT NOT NULL, "texto" TEXT NOT NULL, "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "escritorio_mensagens_sala_criado_em_idx" ON "escritorio_mensagens"("sala", "criado_em");
