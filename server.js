const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// --- Conexión a la base de datos Postgres (Render la inyecta como variable de entorno) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Necesario para conectarse a Render Postgres
});

// Crear la tabla si no existe (se ejecuta una sola vez al arrancar el servidor)
async function inicializarDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lecturas (
                id SERIAL PRIMARY KEY,
                temperatura REAL,
                humedad REAL,
                gas REAL,
                creado_en TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Tabla "lecturas" lista.');
    } catch (err) {
        console.error('Error creando la tabla:', err);
    }
}
inicializarDB();

app.use(express.json()); // Permite procesar los datos JSON que envíe el ESP32
app.use(express.static('public')); // Carpeta donde pondremos el Dashboard más adelante

// Ruta POST para recibir datos de los sensores
app.post('/api/data', async (req, res) => {
    const { temperatura, humedad, gas } = req.body;

    console.log(`Datos -> Temp: ${temperatura}°C | Hum: ${humedad}% | Gas: ${gas}`);

    // Guardar en la base de datos
    try {
        await pool.query(
            'INSERT INTO lecturas (temperatura, humedad, gas) VALUES ($1, $2, $3)',
            [temperatura, humedad, gas]
        );
    } catch (err) {
        console.error('Error guardando en la base de datos:', err);
    }

    // Reenviar datos inmediatamente al Dashboard web
    io.emit('sensorData', {
        temperatura,
        humedad,
        gas,
        timestamp: new Date().toLocaleTimeString()
    });

    res.status(200).send({ status: "success", message: "Datos recibidos" });
});

// Ruta GET para consultar el histórico (por ejemplo, las últimas 50 lecturas)
app.get('/api/historial', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT temperatura, humedad, gas, creado_en FROM lecturas ORDER BY creado_en DESC LIMIT 50'
        );
        res.status(200).json(resultado.rows.reverse()); // reverse para que quede de más viejo a más nuevo
    } catch (err) {
        console.error('Error consultando el historial:', err);
        res.status(500).send({ status: "error", message: "No se pudo consultar el historial" });
    }
});

// Permitir que la plataforma elija el puerto dinámicamente
const PORT = process.env.PORT || 3000;

// Quitamos '127.0.0.1' para que escuche en todas las interfaces de red de la nube
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});