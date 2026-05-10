#!/bin/sh

echo "######################################"
echo "### START.SH EJECUTÁNDOSE ###"
echo "######################################"
echo "PORT=${PORT:-NOT_SET}"
echo "NODE_ENV=${NODE_ENV:-NOT_SET}"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
echo "PWD=$(pwd)"
echo "ls -la node_modules/.bin/next:"
ls -la node_modules/.bin/next || echo "NEXT BINARY NOT FOUND"
echo "ls -la .next:"
ls -la .next | head -5 || echo ".next DIR NOT FOUND"

echo "### Paso 1: Migraciones ###"
npx prisma migrate deploy
MIGRATE_EXIT=$?
echo "### Migraciones terminaron con código: ${MIGRATE_EXIT} ###"

if [ "${MIGRATE_EXIT}" != "0" ]; then
  echo "### ERROR: migraciones fallaron ###"
  exit 1
fi

echo "### Paso 2: Iniciando Next.js en puerto ${PORT:-3000} ###"
exec node_modules/.bin/next start -p "${PORT:-3000}"
