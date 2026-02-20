# Etapa de compilación
FROM golang:1.18.2-alpine AS builder
WORKDIR /app

ENV GO111MODULE=on

COPY . .
RUN go mod init github.com/bortizf/microservice-app-example/tree/master/auth-api && \
    go mod tidy && \
    go build -o auth-api

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/auth-api .

EXPOSE 8000

CMD ["./auth-api"]