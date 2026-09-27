CREATE TABLE "auditoria_usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "rota" TEXT,
    "detalhes" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auditoria_usuarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "auditoria_usuarios_user_id_criado_em_idx" ON "auditoria_usuarios"("user_id", "criado_em");
CREATE INDEX "auditoria_usuarios_user_email_criado_em_idx" ON "auditoria_usuarios"("user_email", "criado_em");
