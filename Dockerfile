# ============================================================
# ArthaFiloka — MONOLITH (Next.js + ai-service dalam 1 image)
# Cocok untuk pemakaian pribadi/2 orang: 1 container, 1 URL.
#
# Build (NEXT_PUBLIC_* wajib saat build — diambil dari .env):
#   docker build \
#     --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
#     --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
#     --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
#     --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
#     --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
#     --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... \
#     --build-arg NEXT_PUBLIC_ALLOWED_EMAILS=... \
#     -t arthafiloka .
#
# Atau langsung: docker compose up -d --build
# ============================================================

# ---------- Stage 1: build Next.js (standalone) ----------
FROM node:20-slim AS web-build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* di-bake ke bundle client saat build → sediakan via build args.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_ALLOWED_EMAILS
RUN set -e; \
  if [ -n "$NEXT_PUBLIC_FIREBASE_API_KEY" ]; then \
    printf 'NEXT_PUBLIC_FIREBASE_API_KEY=%s\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=%s\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=%s\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=%s\nNEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=%s\nNEXT_PUBLIC_FIREBASE_APP_ID=%s\nNEXT_PUBLIC_ALLOWED_EMAILS=%s\n' \
      "$NEXT_PUBLIC_FIREBASE_API_KEY" "$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
      "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" "$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
      "$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "$NEXT_PUBLIC_FIREBASE_APP_ID" \
      "$NEXT_PUBLIC_ALLOWED_EMAILS" > .env.production; \
  fi

RUN npm run build

# ---------- Stage 2: image final (node + python) ----------
FROM node:20-slim
ENV NODE_ENV=production \
    TZ=Asia/Jakarta \
    PORT=3000 \
    AI_SERVICE_URL=http://127.0.0.1:8006

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*

# --- ai-service (Agno + Firestore admin + STT) ---
COPY ai-service/requirements.txt /opt/ai/requirements.txt
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir -r /opt/ai/requirements.txt
COPY ai-service/app /opt/ai/app

# --- Next.js standalone (tanpa node_modules penuh) ---
COPY --from=web-build /app/.next/standalone /opt/web
COPY --from=web-build /app/.next/static /opt/web/.next/static
COPY --from=web-build /app/public /opt/web/public

COPY docker-start.sh /opt/start.sh
RUN chmod +x /opt/start.sh

EXPOSE 3000
CMD ["/opt/start.sh"]
