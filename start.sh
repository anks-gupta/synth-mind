#!/bin/sh
set -e

# Start BgUtils POT Provider server in the background
if [ -d "/opt/bgutil-ytdlp-pot-provider/server" ]; then
  echo "🚀 Starting bgutil-ytdlp-pot-provider background server..."
  (cd /opt/bgutil-ytdlp-pot-provider/server && npm start) &
  sleep 2
fi

# Start Next.js production server in foreground
echo "🚀 Starting Next.js production server..."
exec npm run start
