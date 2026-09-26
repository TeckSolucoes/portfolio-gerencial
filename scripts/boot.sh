#!/bin/sh
# Boot do container: migra (só se houver pendência), semeia e sobe o app.
# Num deploy o container antigo pode ainda estar segurando o SQLite; por isso cada passo
# que escreve no banco tenta de novo antes de desistir, e o ls mostra o volume a cada falha.

tentar() {
  n=0
  until "$@"; do
    n=$((n + 1))
    echo "falhou (tentativa $n de 8): $*"
    ls -la /app/data
    if [ "$n" -ge 8 ]; then
      exit 1
    fi
    sleep 10
  done
}

if node scripts/migracoes-pendentes.cjs; then
  echo "sem migracoes pendentes: pulando migrate deploy"
else
  # 1º caminho: aplica direto no SQLite esperando o banco liberar. Código 2 = caso que ele não cobre
  # (banco novo, migração que recria tabela): aí vale o prisma migrate deploy.
  node scripts/aplicar-migracoes.cjs
  codigo=$?
  if [ "$codigo" -eq 2 ]; then
    tentar npx prisma migrate deploy
  elif [ "$codigo" -ne 0 ]; then
    tentar node scripts/aplicar-migracoes.cjs
  fi
fi

tentar npm run seed
exec npm run start
