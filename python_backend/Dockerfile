FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY python_backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY python_backend/ /app/

RUN useradd --create-home --shell /bin/bash appuser \
  && chown -R appuser:appuser /app

USER appuser

EXPOSE 8081

CMD ["python", "main.py"]
