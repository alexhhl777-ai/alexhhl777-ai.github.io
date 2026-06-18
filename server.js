const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Храним все stroke на сервере
let strokes = [];
let markers = {}; // userId -> marker

const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        const htmlPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(htmlPath)) {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(fs.readFileSync(htmlPath, 'utf8'));
        } else {
            res.writeHead(404);
            res.end('art_board.html not found. Place it next to server.js');
        }
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    let userId = null;

    // Отправляем текущее состояние новому клиенту
    ws.send(JSON.stringify({
        type: 'init',
        strokes: strokes,
        markers: markers
    }));

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'join') {
                userId = msg.userId;
                console.log('User joined:', userId);
            }

            else if (msg.type === 'draw') {
                strokes.push(msg.stroke);
                broadcast({ type: 'draw', stroke: msg.stroke }, ws);
            }

            else if (msg.type === 'erase') {
                strokes = strokes.filter(s => s.id !== msg.strokeId);
                broadcast({ type: 'erase', strokeId: msg.strokeId }, ws);
            }

            else if (msg.type === 'marker') {
                markers[msg.userId] = msg.marker;
                broadcast({ type: 'marker', userId: msg.userId, marker: msg.marker }, ws);
            }

            else if (msg.type === 'clear') {
                strokes = strokes.filter(s => s.userId !== msg.userId);
                delete markers[msg.userId];
                broadcast({ type: 'clear', userId: msg.userId }, ws);
            }

            else if (msg.type === 'clearAll') {
                strokes = [];
                markers = {};
                broadcast({ type: 'clearAll' }, ws);
            }

        } catch (e) {
            console.error('Error:', e);
        }
    });

    ws.on('close', () => {
        console.log('User disconnected:', userId);
    });
});

function broadcast(msg, excludeWs) {
    wss.clients.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

server.listen(PORT, () => {
    console.log('========================================');
    console.log('  Art Board Server running!');
    console.log('  Open: http://localhost:' + PORT);
    console.log('========================================');
});
// ЗДЕСЬ ФАЙЛ ДОЛЖЕН ЗАКОНЧИТЬСЯ. Никаких кавычек ''' и кода Python быть не должно!
