'use strict';

const http = require('http');
const crypto = require('crypto');

const HTTP_PORT = Number(process.env.BRIDGE_PORT || 8091);
const WS_PATH = '/ws';
const POST_PATH = '/sensor';
const clients = new Set();

let latestPayload = {
    accuracy: null,
    timestamp: Date.now(),
    values: [0, 0, 0, 1]
};

function encodeWebSocketFrame(payload) {
    let body = Buffer.from(payload);
    let header;

    if (body.length < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81;
        header[1] = body.length;
    } else if (body.length < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(body.length, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(body.length), 2);
    }

    return Buffer.concat([header, body]);
}

function broadcastLatestPayload() {
    let message = encodeWebSocketFrame(JSON.stringify(latestPayload));

    clients.forEach(function(client) {
        if (client.destroyed) {
            clients.delete(client);
            return;
        }

        client.write(message);
    });
}

function parseRequestBody(request, callback) {
    let chunks = [];

    request.on('data', function(chunk) {
        chunks.push(chunk);
    });

    request.on('end', function() {
        callback(Buffer.concat(chunks).toString('utf8'));
    });
}

function normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    if (Array.isArray(payload.values)) {
        return {
            accuracy: payload.accuracy ?? null,
            timestamp: payload.timestamp ?? Date.now(),
            values: payload.values
        };
    }

    if (Array.isArray(payload.rotationVector)) {
        return {
            accuracy: payload.accuracy ?? null,
            timestamp: payload.timestamp ?? Date.now(),
            values: payload.rotationVector
        };
    }

    if (
        typeof payload.x === 'number' &&
        typeof payload.y === 'number' &&
        typeof payload.z === 'number'
    ) {
        let values = [payload.x, payload.y, payload.z];

        if (typeof payload.w === 'number') {
            values.push(payload.w);
        }

        return {
            accuracy: payload.accuracy ?? null,
            timestamp: payload.timestamp ?? Date.now(),
            values: values
        };
    }

    return null;
}

const server = http.createServer(function(request, response) {
    if (request.method === 'OPTIONS') {
        response.writeHead(204, {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Origin': '*'
        });
        response.end();
        return;
    }

    if (request.method === 'GET' && request.url === '/health') {
        response.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        });
        response.end(JSON.stringify({
            httpPort: HTTP_PORT,
            postPath: POST_PATH,
            wsPath: WS_PATH
        }));
        return;
    }

    if (request.method === 'POST' && request.url === POST_PATH) {
        parseRequestBody(request, function(rawBody) {
            let parsed;

            try {
                parsed = JSON.parse(rawBody);
            } catch (error) {
                response.writeHead(400, {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                });
                response.end(JSON.stringify({ error: 'Invalid JSON body' }));
                return;
            }

            let payload = normalizePayload(parsed);
            if (!payload) {
                response.writeHead(422, {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                });
                response.end(JSON.stringify({
                    error: 'Expected JSON with values[], rotationVector[], or x/y/z(/w)'
                }));
                return;
            }

            latestPayload = payload;
            response.writeHead(202, {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            });
            response.end(JSON.stringify({ ok: true }));
        });
        return;
    }

    response.writeHead(404, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    });
    response.end(JSON.stringify({ error: 'Not found' }));
});

server.on('upgrade', function(request, socket) {
    if (request.url !== WS_PATH) {
        socket.destroy();
        return;
    }

    let key = request.headers['sec-websocket-key'];
    if (!key) {
        socket.destroy();
        return;
    }

    let acceptKey = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Accept: ' + acceptKey + '\r\n\r\n'
    );

    clients.add(socket);

    socket.on('close', function() {
        clients.delete(socket);
    });

    socket.on('end', function() {
        clients.delete(socket);
    });

    socket.on('error', function() {
        clients.delete(socket);
    });

    socket.on('data', function(buffer) {
        if ((buffer[0] & 0x0f) === 0x08) {
            socket.end();
            clients.delete(socket);
        }
    });
});

setInterval(broadcastLatestPayload, 20);

server.listen(HTTP_PORT, function() {
    console.log('Sensor bridge listening on http://127.0.0.1:' + HTTP_PORT);
    console.log('POST sensor data to ' + POST_PATH + ' and connect WebSocket clients to ' + WS_PATH);
});
