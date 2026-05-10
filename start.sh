#!/bin/sh

npx prisma migrate deploy || exit 1

exec node_modules/.bin/next start -p "${PORT:-3000}"
