# Asisten AI service — dipakai untuk deploy (Cloud Run / Railway / VPS Docker).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Cloud Run/Railway menyuntikkan PORT; default 8006 konsisten dengan lokal.
ENV PORT=8006
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
