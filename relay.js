const WebSocket = require('ws');
const http = require('http');

// Create a basic HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('PPT Runner Cloud Relay is active.\n');
});

const wss = new WebSocket.Server({ server });

// This object will hold our active sessions
// Format: { "SESSION_123": { desktop: ws, mobile: ws } }
const sessions = {};

wss.on('connection', (ws, req) => {
    // Expected URL format: /desktop/SESSION_ID or /mobile/SESSION_ID
    const urlParts = req.url.split('/').filter(Boolean);
    if (urlParts.length !== 2) {
        ws.close();
        return;
    }

    const role = urlParts[0]; // "desktop" or "mobile"
    const sessionId = urlParts[1]; // e.g., "XYZ-123"

    console.log(`🔌 [${sessionId}] ${role} connected.`);

    // Initialize session if it doesn't exist
    if (!sessions[sessionId]) {
        sessions[sessionId] = { desktop: null, mobile: null };
    }

    // Assign the connection to the correct role
    sessions[sessionId][role] = ws;

    // Listen for messages
    ws.on('message', (message) => {
        const textMessage = message.toString();
        console.log(`📨 [${sessionId}] ${role} sent: ${textMessage}`);

        // If mobile sends a message, forward it to the desktop!
        if (role === 'mobile' && sessions[sessionId].desktop) {
            sessions[sessionId].desktop.send(textMessage);
        }
    });

    // Cleanup when someone disconnects
    ws.on('close', () => {
        console.log(`🔴 [${sessionId}] ${role} disconnected.`);
        sessions[sessionId][role] = null;
        
        // If both leave, delete the session to save memory
        if (!sessions[sessionId].desktop && !sessions[sessionId].mobile) {
            delete sessions[sessionId];
            console.log(`🗑️ [${sessionId}] Session deleted.`);
        }
    });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`☁️  PPT Runner Relay Server running on port ${PORT}`);
});