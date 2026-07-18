const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
470
16.5

app.use(express.json()); // Permite procesar los datos JSON que envíe el ESP32
app.use(express.static('public')); // Carpeta donde pondremos el Dashboard más adelante

// Ruta POST para recibir datos de los sensores
app.post('/api/data', (req, res) => {
    const { temperatura, humedad, gas } = req.body;
    
    console.log(`Datos -> Temp: ${temperatura}°C | Hum: ${humedad}% | Gas: ${gas}`);

    // Reenviar datos inmediatamente al Dashboard web
    io.emit('sensorData', { 
        temperatura, 
        humedad, 
        gas, 
        timestamp: new Date().toLocaleTimeString() 
    });

    res.status(200).send({ status: "success", message: "Datos recibidos" });
});

// CAMBIO AQUÍ: Permitir que la plataforma elija el puerto dinámicamente
const PORT = process.env.PORT || 3000;

// IMPORTANTE: Quitamos '127.0.0.1' para que escuche en todas las interfaces de red de la nube
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});