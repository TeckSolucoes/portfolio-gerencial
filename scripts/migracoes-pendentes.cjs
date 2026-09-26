// Sai com 0 quando todas as migrações da pasta já constam como aplicadas no banco.
// Lê o banco só em leitura: o "prisma migrate deploy" escreve para checar e cai com
// "database is locked" enquanto outro processo segura o SQLite, mesmo sem nada a aplicar.
// Qualquer dúvida (banco novo, tabela ausente, erro de leitura) sai com 1 e deixa o
// migrate deploy decidir.
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const url = process.env.DATABASE_URL || 'file:./data/teck-portfolio.db';
const arquivo = path.resolve(process.cwd(), url.replace(/^file:/, '').split('?')[0]);
const pasta = path.resolve(process.cwd(), 'prisma/migrations');

try {
  const nomes = fs
    .readdirSync(pasta, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(pasta, d.name, 'migration.sql')))
    .map((d) => d.name);

  const db = new Database(arquivo, { readonly: true, fileMustExist: true, timeout: 5000 });
  const aplicadas = new Set(
    db.prepare('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL').all().map((r) => r.migration_name),
  );
  db.close();

  const pendentes = nomes.filter((n) => !aplicadas.has(n));
  if (pendentes.length === 0) process.exit(0);
  console.log(`migracoes pendentes: ${pendentes.join(', ')}`);
  process.exit(1);
} catch (e) {
  console.log(`nao foi possivel checar migracoes (${e.message}); deixando o migrate deploy decidir`);
  process.exit(1);
}
