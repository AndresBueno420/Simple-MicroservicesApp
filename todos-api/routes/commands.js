const express = require('express');
const router = express.Router();

module.exports = ({ redisClient, logChannel, tracer }) => {
    router.post('/', (req, res) => {
        const userId = req.user.username;
        const id = Date.now().toString(); 
        const todo = { id, content: req.body.content, userId };

        redisClient.hset(`todos:${userId}`, id, JSON.stringify(todo), (err) => {
            if (err) return res.status(500).json({ error: "Error al escribir en Redis" });

            const event = { opName: 'CREATE', username: userId, todoId: id };
            
            if (tracer) {
                tracer.scoped(() => {
                    event.zipkinSpan = tracer.id;
                    redisClient.publish(logChannel, JSON.stringify(event));
                });
            } else {
                redisClient.publish(logChannel, JSON.stringify(event));
            }

            res.status(201).json(todo);
        });
    });

    router.delete('/:id', (req, res) => {
        const userId = req.user.username;
        const todoId = req.params.id;

        redisClient.hdel(`todos:${userId}`, todoId, (err) => {
            if (err) return res.status(500).json({ error: "Error al borrar en Redis" });

            const event = { opName: 'DELETE', username: userId, todoId };
            redisClient.publish(logChannel, JSON.stringify(event));

            res.status(204).end();
        });
    });

    return router;
};