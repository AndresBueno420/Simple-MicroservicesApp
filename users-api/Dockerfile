# Usamos Amazon Corretto 8 (la versión estable de Java 8)
FROM amazoncorretto:8-alpine AS build
WORKDIR /app

# 1. Copiamos explícitamente los archivos de construcción
# Tu imagen muestra que estos archivos están en la raíz de users-api
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

# 2. Corregimos posibles problemas de formato (Windows vs Linux)
# y damos permisos de ejecución
RUN tr -d '\r' < mvnw > mvnw_unix && \
    mv mvnw_unix mvnw && \
    chmod +x mvnw

# 3. Copiamos el código fuente
COPY src src

# 4. Construimos (usando ./ para asegurar que es la ruta actual)
RUN ./mvnw clean install -DskipTests

# Etapa de ejecución
FROM amazoncorretto:8-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

ENV JWT_SECRET=PRFT
ENV SERVER_PORT=8083

EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]