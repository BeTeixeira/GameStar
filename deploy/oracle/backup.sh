#!/bin/sh
# Backup diário do banco e das fotos de perfil, guardando os últimos 14 dias.
# Agendado pelo cron (veja docs/deploy-oracle.md, passo 9):
#   0 4 * * * /home/ubuntu/GameStar/deploy/oracle/backup.sh >> /home/ubuntu/backups/backup.log 2>&1
set -eu

cd "$(dirname "$0")"
DEST="$HOME/backups"
STAMP="$(date +%Y-%m-%d)"
mkdir -p "$DEST"

docker compose exec -T db pg_dump -U gamestar -d gamestar | gzip > "$DEST/db-$STAMP.sql.gz"
docker compose exec -T api tar -czf - -C /app uploads > "$DEST/uploads-$STAMP.tar.gz"

find "$DEST" -name "db-*.sql.gz" -mtime +14 -delete
find "$DEST" -name "uploads-*.tar.gz" -mtime +14 -delete
echo "$(date -Is) backup ok"
