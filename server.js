/**
 * AWS IoT WebSocket Proxy Server with Push Notifications
 *
 * This server acts as a bridge between the web dashboard and AWS IoT Core.
 * It handles authentication, forwards MQTT messages via WebSocket, and sends push notifications.
 *
 * Setup:
 * 1. npm install express ws aws-iot-device-sdk dotenv cors web-push
 * 2. Create .env file with AWS credentials and VAPID keys
 * 3. Run: node server.js
 */

const express = require('express');
const WebSocket = require('ws');
const awsIot = require('aws-iot-device-sdk');
const cors = require('cors');
const path = require('path');
const webpush = require('web-push');
const fs = require('fs');
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

                // Check sensor thresholds and send notifications
                checkSensorThresholds(data);

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

// ==================== PUSH NOTIFICATION SYSTEM ====================

// Configure VAPID details for web push
// Generate keys with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'GENERATE_WITH_WEB_PUSH';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'GENERATE_WITH_WEB_PUSH';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:your-email@example.com';

if (VAPID_PUBLIC_KEY !== 'GENERATE_WITH_WEB_PUSH') {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
    console.log('✅ VAPID keys configured for push notifications');
} else {
    console.log('⚠️  VAPID keys not configured. Run: npx web-push generate-vapid-keys');
}

// Store push subscriptions (in production, use a database)
let pushSubscriptions = new Map(); // Map<subscriptionEndpoint, {subscription, thresholds, lastAlert}>

// Storage file for subscriptions
const SUBSCRIPTIONS_FILE = './push-subscriptions.json';

// Load subscriptions from file
function loadSubscriptions() {
    try {
        if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
            const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
            const subscriptions = JSON.parse(data);
            pushSubscriptions = new Map(Object.entries(subscriptions));
            console.log(`✅ Loaded ${pushSubscriptions.size} push subscriptions`);
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
    }
}

// Save subscriptions to file
function saveSubscriptions() {
    try {
        const subscriptions = Object.fromEntries(pushSubscriptions);
        fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    } catch (error) {
        console.error('Error saving subscriptions:', error);
    }
}

// Load subscriptions on startup
loadSubscriptions();

// API endpoint to get VAPID public key
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// API endpoint to subscribe to push notifications
app.post('/api/subscribe', (req, res) => {
    const { subscription, thresholds } = req.body;

    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Invalid subscription' });
    }

    // Store subscription with thresholds
    pushSubscriptions.set(subscription.endpoint, {
        subscription,
        thresholds: thresholds || { maxTemp: 80, maxHumidity: 70, maxAirQuality: 1000, minLight: 100 },
        lastAlert: {}
    });

    saveSubscriptions();

    console.log(`✅ New push subscription registered (total: ${pushSubscriptions.size})`);

    res.json({
        success: true,
        message: 'Successfully subscribed to push notifications'
    });
});

// API endpoint to unsubscribe from push notifications
app.post('/api/unsubscribe', (req, res) => {
    const { endpoint } = req.body;

    if (pushSubscriptions.has(endpoint)) {
        pushSubscriptions.delete(endpoint);
        saveSubscriptions();
        console.log(`Unsubscribed: ${endpoint}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Subscription not found' });
    }
});

// API endpoint to manually send a notification (for testing)
app.post('/api/notify', async (req, res) => {
    const { subscription, alerts } = req.body;

    if (!subscription) {
        return res.status(400).json({ error: 'No subscription provided' });
    }

    const payload = JSON.stringify({
        title: 'Smart Weather Station Alert',
        body: alerts.join('\n'),
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'sws-alert',
        critical: true
    });

    try {
        await webpush.sendNotification(subscription, payload);
        console.log('✅ Push notification sent');
        res.json({ success: true, message: 'Notification sent' });
    } catch (error) {
        console.error('❌ Error sending notification:', error);

        // If subscription is invalid, remove it
        if (error.statusCode === 404 || error.statusCode === 410) {
            pushSubscriptions.delete(subscription.endpoint);
            saveSubscriptions();
        }

        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// Check sensor data against thresholds and send alerts
function checkSensorThresholds(sensorData) {
    if (pushSubscriptions.size === 0) return;

    pushSubscriptions.forEach((subData, endpoint) => {
        const { subscription, thresholds, lastAlert } = subData;
        const alerts = [];

        // Check temperature
        if (sensorData.tempF > thresholds.maxTemp) {
            if (!lastAlert.temp || Date.now() - lastAlert.temp > 300000) { // 5 min cooldown
                alerts.push(`🌡️ High temperature: ${sensorData.tempF}°F (limit: ${thresholds.maxTemp}°F)`);
                lastAlert.temp = Date.now();
            }
        }

        // Check humidity
        if (sensorData.hum > thresholds.maxHumidity) {
            if (!lastAlert.hum || Date.now() - lastAlert.hum > 300000) {
                alerts.push(`💧 High humidity: ${sensorData.hum}% (limit: ${thresholds.maxHumidity}%)`);
                lastAlert.hum = Date.now();
            }
        }

        // Check air quality
        if (sensorData.air > thresholds.maxAirQuality) {
            if (!lastAlert.air || Date.now() - lastAlert.air > 300000) {
                alerts.push(`💨 Poor air quality: ${sensorData.air} (limit: ${thresholds.maxAirQuality})`);
                lastAlert.air = Date.now();
            }
        }

        // Check light level
        if (sensorData.light < thresholds.minLight) {
            if (!lastAlert.light || Date.now() - lastAlert.light > 300000) {
                alerts.push(`💡 Low light: ${sensorData.light} (limit: ${thresholds.minLight})`);
                lastAlert.light = Date.now();
            }
        }

        // Send notification if there are alerts
        if (alerts.length > 0) {
            const payload = JSON.stringify({
                title: 'Smart Weather Station Alert',
                body: alerts.join('\n'),
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'sws-alert-' + Date.now(),
                critical: true,
                vibrate: [200, 100, 200]
            });

            webpush.sendNotification(subscription, payload)
                .then(() => {
                    console.log(`✅ Alert sent to ${endpoint.substring(0, 50)}...`);
                })
                .catch(error => {
                    console.error('❌ Failed to send notification:', error.message);

                    // Remove invalid subscriptions
                    if (error.statusCode === 404 || error.statusCode === 410) {
                        pushSubscriptions.delete(endpoint);
                        saveSubscriptions();
                    }
                });
        }
    });
}

console.log('\n🔔 Push Notification System Ready');
console.log(`📊 Active subscriptions: ${pushSubscriptions.size}\n`);

