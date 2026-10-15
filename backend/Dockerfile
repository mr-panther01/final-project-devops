# Multi-stage Dockerfile for FastAPI Backend
# Stage 1: Build & Dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Final Runtime Image
FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime PostgreSQL client library
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (DevOps Rubric M4 requirement)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

# Copy installed python dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application and migration code
COPY alembic.ini .
COPY alembic alembic
COPY app app

# Set environment variables
ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Fix permissions
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Run Alembic migrations and start Uvicorn
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
