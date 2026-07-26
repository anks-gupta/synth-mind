#!/bin/sh
set -e

echo "[start.sh] Launching BgUtils POT provider server on port 4416..."
node /opt/bgutil-ytdlp-pot-provider/server/build/main.js &
POT_PID=$!

# Give it a moment to come up before the app starts serving traffic
sleep 2

echo "[start.sh] POT provider PID: $POT_PID"
echo "[start.sh] Starting Next.js app..."

# Run Next.js in the foreground — this is the process Render/Docker monitors.
# If it exits, the container exits (which is what we want).
exec npm start
