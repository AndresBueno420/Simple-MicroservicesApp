'use strict';

const express = require('express');
const bodyParser = require("body-parser");
const jwt = require('express-jwt');
const redis = require("redis");

const port = process.env.TODO_API_PORT || 8082;
const jwtSecret = process.env.JWT_SECRET || "foo";
const logChannel = process.env.REDIS_CHANNEL || 'log_channel';
const ZIPKIN_URL = process.env.ZIPKIN_URL;

const app = express();

let tracer = null;

if (ZIPKIN_URL && ZIPKIN_URL !== 'disabled') {
    try {
        const { Tracer, BatchRecorder, jsonEncoder: { JSON_V2 } } = require('zipkin');
        const CLSContext = require('zipkin-context-cls');
        const { HttpLogger } = require('zipkin-transport-http');
        const zipkinMiddleware = require('zipkin-instrumentation-express').expressMiddleware;

        const ctxImpl = new CLSContext('zipkin');
        const recorder = new BatchRecorder({
            logger: new HttpLogger({
                endpoint: ZIPKIN_URL,
                jsonEncoder: JSON_V2
            })
        });
        tracer = new Tracer({ ctxImpl, recorder, localServiceName: 'todos-api' });
        
        app.use(zipkinMiddleware({ tracer }));
        console.log('Zipkin habilitado en:', ZIPKIN_URL);
    } catch (e) {
        console.error('Error al cargar Zipkin, procediendo sin trazabilidad:', e.message);
    }
} else {
    console.log('Zipkin deshabilitado por configuración.');
}

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined, 
    retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('El servidor Redis rechazó la conexión');
        }
        return Math.min(options.attempt * 100, 2000);
    }
});

redisClient.on('connect', () => console.log('Conectado a Redis con éxito'));
redisClient.on('error', (err) => console.error(' Error en Cliente Redis:', err));

app.use(jwt({ secret: jwtSecret })); 
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send({ message: 'Token inválido o ausente' });
    }
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const commandRoutes = require('./routes/commands');
const queryRoutes = require('./routes/queries');


app.use('/todos', commandRoutes({ redisClient, logChannel, tracer }));
app.use('/todos', queryRoutes({ redisClient }));


app.listen(port, () => {
    console.log('----------------------------------------------------');
    console.log(`TODOs API funcionando en puerto: ${port}`);
    console.log(` Modo: CQRS con Almacén Único (Redis)`);
    console.log('----------------------------------------------------');
});