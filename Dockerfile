FROM node:20-alpine AS base

# Install system dependencies: python3, ffmpeg, curl, openssl, libc6-compat, and yt-dlp
RUN apk add --no-cache python3 py3-pip ffmpeg curl ca-certificates openssl libc6-compat && \
    pip3 install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

# Copy package manifests and Prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Copy application source code
COPY . .

# Generate Prisma Client and compile Next.js production build
RUN npx prisma generate
RUN npm run build

# Expose default port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start Next.js production server
CMD ["npm", "run", "start"]
