# Usamos la versión exacta de Python mencionada en el README
FROM python:3.6-slim

WORKDIR /app

# Instalamos dependencias del sistema si fueran necesarias para compilar librerías de Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiamos requerimientos e instalamos según el README
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copiamos el resto del código (main.py)
COPY . .

# Variables de entorno por defecto (serán sobrescritas por el Docker Compose)
ENV REDIS_HOST=127.0.0.1
ENV REDIS_PORT=6379
ENV REDIS_CHANNEL=log_channel

# Ejecutamos usando python3 como indica el README
CMD ["python3", "main.py"]