FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps for audio handling and building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsndfile1 \
    portaudio19-dev \
  && rm -rf /var/lib/apt/lists/*

COPY python_backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY python_backend/ /app/

EXPOSE 8081

CMD ["python", "main.py"]
