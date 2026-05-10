#!/bin/sh
set -e

echo "=== START.SH: iniciando ==="
echo "PORT=${PORT}"
echo "NODE_ENV=${NODE_ENV}"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"

echo "=== Corriendo migraciones ==="
npx prisma migrate deploy

echo "=== Migraciones OK. Iniciando Next.js en puerto ${PORT:-3000} ==="
exec node_modules/.bin/next start -p "${PORT:-3000}"
