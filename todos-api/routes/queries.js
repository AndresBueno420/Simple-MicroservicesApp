const express = require('express');
const router = express.Router();

module.exports = ({ redisClient }) => {
    // QUERY: Obtener todos los TODOs del usuario
    router.get('/', (req, res) => {
        const userId = req.user.username; // Extraído del JWT
        
        redisClient.hgetall(`todos:${userId}`, (err, obj) => {
            if (err) return res.status(500).send(err);
            
            // Convertimos el hash de Redis a un array para el Frontend
            const todos = obj ? Object.values(obj).map(JSON.parse) : [];
            res.json(todos);
        });
    });

    return router;
};