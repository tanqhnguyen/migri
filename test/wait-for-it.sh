#!/bin/sh
ENV_FILE="/app/.env"
set -a
[ -f $ENV_FILE ] && . $ENV_FILE
set +a

set -e
cmd="$@"

>&2 echo "Checking for postgres $POSTGRES_HOST:$POSTGRES_PORT"
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USERNAME" -p "$POSTGRES_PORT" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up"

ARANGODB_URL="$ARANGO_HOST:$ARANGO_PORT/_db/_system/_admin/aardvark/index.html"
>&2 echo "Checking $ARANGODB_URL"
until [ 200 -eq $(curl --write-out "%{http_code}\n" --silent --output /dev/null "$ARANGODB_URL") ]; do
  >&2 echo "Arangodb is unavailable - sleeping"
  sleep 1
done

>&2 echo "Arangodb is up"

exec $cmd
