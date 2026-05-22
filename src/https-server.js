const express = require('express');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();

const server = https.createServer(
    {
        key: fs.readFileSync(path.join(__dirname, '../certs/dev-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../certs/dev-cert.pem'))
    },
    app
);

const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => {
    res.redirect('/phone');
});

app.get('/phone', (req, res) => {
    res.sendFile(path.join(__dirname, 'phone.html'));
});

app.get('/ar', (req, res) => {
    res.sendFile(path.join(__dirname, 'ar.html'));
});

app.use(express.static(path.join(__dirname)));
app.use('/Utils', express.static(path.join(__dirname, '../Utils')));

let lastData = { alpha: 0, beta: 0, gamma: 0 };
let isPhoneConnected = false;

wss.on('connection', (ws) => {
    console.log('--- New HTTPS WebSocket connection ---');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            lastData = data;
            isPhoneConnected = true;

            console.log(
                `PHONE -> Z: ${data.alpha.toFixed(2)}, X: ${data.beta.toFixed(2)}, Y: ${data.gamma.toFixed(2)}`
            );
        } catch (error) {
        }
    });

    ws.on('close', () => {
        console.log('HTTPS WebSocket connection closed');
        isPhoneConnected = false;
    });
});

setInterval(() => {
    if (!isPhoneConnected) {
        return;
    }

    const payload = JSON.stringify(lastData);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}, 20);

const PORT = 8443;
server.listen(PORT, '0.0.0.0', () => {
    console.log('============================================');
    console.log(`HTTPS SERVER STARTED ON PORT ${PORT}`);
    console.log('Phone page: /phone');
    console.log('AR page: /ar');
    console.log('============================================');
});
