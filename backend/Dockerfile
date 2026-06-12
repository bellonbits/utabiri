FROM python:3.12-slim

RUN useradd -m appuser
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# SQLite lives on a volume; swap DATABASE_URL to Postgres when ready
RUN mkdir /data && chown appuser /data
ENV DATABASE_URL=sqlite+aiosqlite:////data/utabiri.db

USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
