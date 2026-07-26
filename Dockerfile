# Use a Node base image since this is a Next.js app
FROM node:20-slim

# Install python3 + pip (yt-dlp needs python), git (to clone the POT provider repo), unzip (for the plugin)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip curl ca-certificates git unzip && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp as a standalone binary (not via pip, to avoid python env conflicts)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Install Deno — required by yt-dlp's EJS/n-challenge solver so it can fully
# resolve YouTube's obfuscated URLs. Not strictly needed for subtitle-only
# extraction, but installing it removes the warning and covers you if you
# ever add video/audio downloading later.
RUN curl -fsSL https://deno.land/install.sh | sh && \
    mv /root/.deno/bin/deno /usr/local/bin/deno
ENV PATH="/usr/local/bin:${PATH}"

# --- BgUtils POT Provider setup ---
# This provides a Proof-of-Origin token to yt-dlp, which is what YouTube now
# checks for on top of cookies. Pin a version so the server and plugin stay
# in sync (bump both together if you ever upgrade).
ENV BGUTIL_VERSION=1.3.1

# 1. Provider server (Node.js) — a background HTTP service on port 4416
RUN git clone --single-branch --branch ${BGUTIL_VERSION} \
    https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-ytdlp-pot-provider
WORKDIR /opt/bgutil-ytdlp-pot-provider/server
RUN npm ci && npx tsc

# 2. Provider plugin (Python, discovered by yt-dlp via its plugin-folder convention)
RUN mkdir -p /root/yt-dlp-plugins && \
    curl -L "https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/${BGUTIL_VERSION}/bgutil-ytdlp-pot-provider.zip" -o /tmp/plugin.zip && \
    unzip /tmp/plugin.zip -d /root/yt-dlp-plugins/ && \
    rm /tmp/plugin.zip

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Startup script launches the POT provider server in the background,
# then starts the Next.js app in the foreground (required so Render
# sees a running process and keeps the container alive)
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["/app/start.sh"]
