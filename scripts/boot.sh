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
  tentar npx prisma migrate deploy
fi

tentar npm run seed
exec npm run start
