#!/bin/sh
set -e

# Postgres tables (patients, conditions, plans, etc.)
npx drizzle-kit migrate

# SQLite auth tables (user, session, account, verification)
echo 'y' | npx @better-auth/cli@latest migrate

# Start the server
exec node server.js
