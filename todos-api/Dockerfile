# Versión específica solicitada
FROM node:8.17.0-alpine

WORKDIR /app

# Instalación de dependencias
COPY package*.json ./
RUN npm install

# Copia de código
COPY . .

# Configuración de variables según el README
ENV TODO_API_PORT=8082
ENV JWT_SECRET=PRFT
ENV REDIS_HOST=redis-queue
ENV REDIS_PORT=6379
ENV REDIS_CHANNEL=log_channel

EXPOSE 8082

# Comando de inicio según el README
CMD ["npm", "start"]