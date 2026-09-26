// Aplica as migrações pendentes direto no SQLite (better-sqlite3), esperando o banco liberar.
// Por que existe: o "prisma migrate deploy" desiste na primeira trava e, num deploy em que o container
// antigo ainda segura o banco, o boot caía em loop. Aqui a espera é do próprio SQLite (busy timeout).
//
// Só cobre o caso comum: banco JÁ existente (tabela _prisma_migrations presente) e migrações
// aditivas. Banco novo, ou migração que mexe em PRAGMA foreign_keys (recriação de tabela), sai com
// código 2 e o boot usa o "prisma migrate deploy". O registro em _prisma_migrations segue o
// formato do Prisma (checksum = sha256 do migration.sql), então os dois caminhos convivem.
//
// Saída: 0 = tudo aplicado (ou nada pendente); 1 = falha (tentar de novo); 2 = usar o Prisma.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const ESPERA_DO_BANCO_MS = 45_000;

function migracoesDaPasta(pasta) {
  return fs
    .readdirSync(pasta, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(pasta, d.name, 'migration.sql')))
    .map((d) => d.name)
    .sort();
}

function aplicar({ arquivoBanco, pastaMigracoes, esperaMs = ESPERA_DO_BANCO_MS, log = console.log }) {
  if (!fs.existsSync(arquivoBanco)) return { codigo: 2, motivo: 'banco ainda não existe' };
  const db = new Database(arquivoBanco, { timeout: esperaMs });
  try {
    const tabela = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get();
    if (!tabela) return { codigo: 2, motivo: 'banco sem histórico de migrações' };

    const aplicadas = new Set(
      db.prepare('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL').all().map((r) => r.migration_name),
    );
    const pendentes = migracoesDaPasta(pastaMigracoes).filter((n) => !aplicadas.has(n));
    if (pendentes.length === 0) return { codigo: 0, aplicadas: [] };

    const sqls = new Map(pendentes.map((n) => [n, fs.readFileSync(path.join(pastaMigracoes, n, 'migration.sql'), 'utf8')]));
    for (const [nome, sql] of sqls) {
      if (/PRAGMA\s+foreign_keys/i.test(sql)) return { codigo: 2, motivo: `${nome} recria tabelas (PRAGMA foreign_keys)` };
    }

    const feitas = [];
    for (const [nome, sql] of sqls) {
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      db.transaction(() => {
        db.exec(sql);
        db.prepare(
          'INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, started_at, applied_steps_count) VALUES (?, ?, ?, ?, NULL, ?, 1)',
        ).run(crypto.randomUUID(), checksum, new Date().toISOString(), nome, new Date().toISOString());
      }).immediate();
      log(`migracao aplicada: ${nome}`);
      feitas.push(nome);
    }
    return { codigo: 0, aplicadas: feitas };
  } finally {
    db.close();
  }
}

module.exports = { aplicar, migracoesDaPasta };

if (require.main === module) {
  const url = process.env.DATABASE_URL || 'file:./data/teck-portfolio.db';
  const arquivoBanco = path.resolve(process.cwd(), url.replace(/^file:/, '').split('?')[0]);
  try {
    const r = aplicar({ arquivoBanco, pastaMigracoes: path.resolve(process.cwd(), 'prisma/migrations') });
    if (r.codigo === 2) console.log(`usando o prisma migrate deploy: ${r.motivo}`);
    process.exit(r.codigo);
  } catch (e) {
    console.log(`falha ao aplicar migracoes: ${e.message}`);
    process.exit(1);
  }
}
