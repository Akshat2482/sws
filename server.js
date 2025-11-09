/**
 * AWS IoT WebSocket Proxy Server
 * 
 * This server acts as a bridge between the web dashboard and AWS IoT Core.
 * It handles authentication and forwards MQTT messages via WebSocket.
 * 
 * Setup:
 * 1. npm install express ws aws-iot-device-sdk dotenv cors
 * 2. Create .env file with AWS credentials
 * 3. Run: node server.js
 */

const express = require('express');
const WebSocket = require('ws');
const awsIot = require('aws-iot-device-sdk');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve the live dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'smart-weather-station-live.html'));
});

// WebSocket server for client connections
const wss = new WebSocket.Server({ noServer: true });

// Store active AWS IoT device connection
let awsIotDevice = null;
let connectedClients = new Set();

// Initialize AWS IoT connection
function initializeAwsIot() {
    if (awsIotDevice) {
        console.log('AWS IoT already connected');
        return;
    }

    const config = {
        keyPath: process.env.AWS_IOT_PRIVATE_KEY_PATH || './certs/private.pem.key',
        certPath: process.env.AWS_IOT_CERTIFICATE_PATH || './certs/certificate.pem.crt',
        caPath: process.env.AWS_IOT_CA_PATH || './certs/AmazonRootCA1.pem',
        host: process.env.AWS_IOT_ENDPOINT || 'a2jxq81rsqt8vu-ats.iot.us-east-1.amazonaws.com',
        port: 8883,
        clientId: process.env.AWS_IOT_CLIENT_ID || 'weather-station-server-' + Math.random().toString(16).substring(2, 8),
        region: process.env.AWS_REGION || 'us-east-1'
    };

    console.log('Connecting to AWS IoT:', config.host);

    try {
        awsIotDevice = awsIot.device(config);

        awsIotDevice.on('connect', () => {
            console.log('✅ Connected to AWS IoT Core');
            const topic = process.env.AWS_IOT_TOPIC || 'devices/esp32/sensors';
            awsIotDevice.subscribe(topic);
            console.log(`📡 Subscribed to topic: ${topic}`);
            
            // Notify all connected web clients
            broadcastToClients({
                type: 'connection',
                status: 'connected',
                message: 'Connected to AWS IoT'
            });
        });

        awsIotDevice.on('message', (topic, payload) => {
            console.log('📨 Message received:', topic, payload.toString());
            
            try {
                const data = JSON.parse(payload.toString());
                // Broadcast to all connected web clients
                broadcastToClients({
                    type: 'sensor-data',
                    topic: topic,
                    data: data,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });

        awsIotDevice.on('error', (error) => {
            console.error('❌ AWS IoT error:', error);
            broadcastToClients({
                type: 'error',
                message: error.message
            });
        });

        awsIotDevice.on('close', () => {
            console.log('⚠️ AWS IoT connection closed');
            awsIotDevice = null;
            broadcastToClients({
                type: 'connection',
                status: 'disconnected',
                message: 'Disconnected from AWS IoT'
            });
        });

        awsIotDevice.on('offline', () => {
            console.log('⚠️ AWS IoT offline');
        });

        awsIotDevice.on('reconnect', () => {
            console.log('🔄 Reconnecting to AWS IoT...');
        });

    } catch (error) {
        console.error('❌ Failed to initialize AWS IoT:', error);
    }
}

// Broadcast message to all connected web clients
function broadcastToClients(message) {
    const payload = JSON.stringify(message);
    connectedClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// Handle WebSocket connections from web clients
wss.on('connection', (ws) => {
    console.log('🌐 New web client connected');
    connectedClients.add(ws);

    // Send connection status
    ws.send(JSON.stringify({
        type: 'connection',
        status: awsIotDevice ? 'connected' : 'disconnected',
        message: awsIotDevice ? 'Connected to AWS IoT' : 'Not connected to AWS IoT'
    }));

    ws.on('message', (message) => {
        console.log('📥 Message from client:', message);
        try {
            const data = JSON.parse(message);
            
            // Handle client commands
            if (data.command === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
        } catch (error) {
            console.error('Error handling client message:', error);
        }
    });

    ws.on('close', () => {
        console.log('🌐 Web client disconnected');
        connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// HTTP server upgrade for WebSocket
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/smart-weather-station-live.html`);
    console.log(`🔧 WebSocket: ws://localhost:${PORT}\n`);
    
    // Initialize AWS IoT connection
    initializeAwsIot();
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down...');
    
    if (awsIotDevice) {
        awsIotDevice.end();
    }
    
    wss.clients.forEach((client) => {
        client.close();
    });
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        awsIotConnected: !!awsIotDevice,
        connectedClients: connectedClients.size,
        uptime: process.uptime()
    });
});

// API endpoint to get connection status
app.get('/api/status', (req, res) => {
    res.json({
        awsIot: {
            connected: !!awsIotDevice,
            endpoint: process.env.AWS_IOT_ENDPOINT || 'Not configured',
            topic: process.env.AWS_IOT_TOPIC || 'devices/esp32/sensors'
        },
        clients: {
            connected: connectedClients.size
        }
    });
});

