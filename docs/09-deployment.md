# 9. Deployment — Docker + Nginx on Ubuntu VPS

Single VPS to start (4 vCPU / 8GB is plenty for early traffic; the
architecture scales by adding API replicas, then a second box).

## docker-compose.yml

```yaml
services:
  nginx:
    image: nginx:1.27-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot-etc:/etc/letsencrypt:ro
      - certbot-www:/var/www/certbot:ro
    depends_on: [api, frontend]
    restart: unless-stopped

  frontend:
    build: ./frontend                # next build → standalone output
    environment:
      - API_INTERNAL_URL=http://api:8000
    expose: ["3000"]
    restart: unless-stopped

  api:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    env_file: .env                   # DATABASE_URL, REDIS_URL, JWT_SECRET,
                                     # LIPANA_SECRET_KEY, LIPANA_WEBHOOK_SECRET,
                                     # RESEND_API_KEY, FRONTEND_URL
    expose: ["8000"]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }
    restart: unless-stopped

  worker:
    build: ./backend
    command: python -m app.worker    # market closing, reconciliation, leaderboard
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: utabiri
      POSTGRES_USER: utabiri
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U utabiri"]
      interval: 5s
      retries: 10
    restart: unless-stopped
    # NOTE: no ports: — reachable only on the compose network

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    restart: unless-stopped

volumes:
  pgdata:
  certbot-etc:
  certbot-www:
```

## nginx/conf.d/utabiri.conf (core)

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=120r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

server {
    listen 443 ssl http2;
    server_name utabiri.co.ke;
    ssl_certificate     /etc/letsencrypt/live/utabiri.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/utabiri.co.ke/privkey.pem;
    add_header Strict-Transport-Security "max-age=63072000" always;
    client_max_body_size 1m;

    location /api/v1/auth/ {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://api:8000;
        include proxy_params;
    }
    location /api/ {
        limit_req zone=api burst=40 nodelay;
        proxy_pass http://api:8000;
        include proxy_params;
    }
    location /webhooks/ {
        proxy_pass http://api:8000;          # signature-authenticated
        include proxy_params;
    }
    location / {
        proxy_pass http://frontend:3000;
        include proxy_params;
    }
}
server {
    listen 80;
    server_name utabiri.co.ke;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
```

## Backend Dockerfile (multi-stage)

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv export --no-dev -o requirements.txt && \
    pip wheel -r requirements.txt -w /wheels

FROM python:3.12-slim
RUN useradd -m appuser
WORKDIR /app
COPY --from=builder /wheels /wheels
RUN pip install --no-index --find-links=/wheels /wheels/* && rm -rf /wheels
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
USER appuser
EXPOSE 8000
```

## Operations

- **Migrations**: `docker compose run --rm api alembic upgrade head` as a
  deploy step (before swapping containers).
- **Deploys**: git pull → `docker compose build` → migrate →
  `docker compose up -d` (brief blip acceptable for MVP; add a second api
  replica + nginx upstream for zero-downtime later).
- **Backups**: nightly cron — `pg_dump -Fc` → encrypt → upload off-box
  (e.g. S3/Backblaze). Test restores monthly.
- **Monitoring**: structured JSON logs (structlog) → journald;
  UptimeRobot/healthchecks.io on `GET /api/v1/health` (checks DB + Redis);
  Sentry for both apps; alert on `webhook_events.error IS NOT NULL` and ledger
  reconciliation drift.
- **Scale path**: 1) more uvicorn workers → 2) second `api` container →
  3) move Postgres to its own box / managed PG → 4) read replica for
  market lists & leaderboard.
```
