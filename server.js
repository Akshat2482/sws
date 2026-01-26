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
const TwilioVoiceService = require('./twilio-service');
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

// ==================== EMERGENCY CALLING SYSTEM ====================

// Initialize Twilio Voice Service
let twilioService = null;
if (process.env.ENABLE_EMERGENCY_CALLS === 'true') {
    twilioService = new TwilioVoiceService();
    if (twilioService.isReady()) {
        console.log('✅ Emergency Calling Service Ready');
    } else {
        console.log('⚠️  Emergency calling disabled - Configure Twilio credentials in .env');
    }
} else {
    console.log('ℹ️  Emergency calling feature is disabled (set ENABLE_EMERGENCY_CALLS=true to enable)');
}

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

// ==================== EMERGENCY CONTACT MANAGEMENT API ====================

// Add emergency contact
app.post('/api/emergency-contacts', (req, res) => {
    const { endpoint, contact } = req.body;

    if (!endpoint || !contact) {
        return res.status(400).json({ error: 'Missing endpoint or contact data' });
    }

    // Validate phone number (E.164 format: +1234567890)
    if (!contact.phone || !contact.phone.match(/^\+[1-9]\d{1,14}$/)) {
        return res.status(400).json({
            error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'
        });
    }

    if (!pushSubscriptions.has(endpoint)) {
        return res.status(404).json({ error: 'Subscription not found' });
    }

    const subData = pushSubscriptions.get(endpoint);

    // Initialize emergencyContacts array if it doesn't exist
    if (!subData.emergencyContacts) {
        subData.emergencyContacts = [];
    }

    // Limit to 5 contacts
    if (subData.emergencyContacts.length >= 5) {
        return res.status(400).json({ error: 'Maximum 5 emergency contacts allowed' });
    }

    // Create new contact
    const newContact = {
        id: 'contact-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        name: contact.name || 'Emergency Contact',
        phone: contact.phone,
        priority: subData.emergencyContacts.length + 1,
        enabled: true,
        addedAt: new Date().toISOString()
    };

    subData.emergencyContacts.push(newContact);
    saveSubscriptions();

    console.log(`✅ Emergency contact added: ${newContact.name} (${newContact.phone})`);

    res.json({
        success: true,
        contact: newContact,
        message: 'Emergency contact added successfully'
    });
});

// Get emergency contacts for a subscription
app.get('/api/emergency-contacts/:endpoint', (req, res) => {
    const endpoint = decodeURIComponent(req.params.endpoint);

    if (!pushSubscriptions.has(endpoint)) {
        return res.status(404).json({ error: 'Subscription not found' });
    }

    const subData = pushSubscriptions.get(endpoint);

    res.json({
        contacts: subData.emergencyContacts || [],
        lastEmergencyCall: subData.lastEmergencyCall || null
    });
});

// Update emergency contact
app.put('/api/emergency-contacts/:contactId', (req, res) => {
    const { contactId } = req.params;
    const { endpoint, updates } = req.body;

    if (!endpoint) {
        return res.status(400).json({ error: 'Missing endpoint' });
    }

    if (!pushSubscriptions.has(endpoint)) {
        return res.status(404).json({ error: 'Subscription not found' });
    }

    const subData = pushSubscriptions.get(endpoint);
    const contact = subData.emergencyContacts?.find(c => c.id === contactId);

    if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
    }

    // Update allowed fields
    if (updates.name) contact.name = updates.name;
    if (updates.phone) {
        if (!updates.phone.match(/^\+[1-9]\d{1,14}$/)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }
        contact.phone = updates.phone;
    }
    if (typeof updates.enabled === 'boolean') contact.enabled = updates.enabled;
    if (typeof updates.priority === 'number') contact.priority = updates.priority;

    saveSubscriptions();

    console.log(`✅ Emergency contact updated: ${contact.name}`);

    res.json({
        success: true,
        contact,
        message: 'Emergency contact updated successfully'
    });
});

// Delete emergency contact
app.delete('/api/emergency-contacts/:contactId', (req, res) => {
    const { contactId } = req.params;
    const { endpoint } = req.body;

    if (!endpoint) {
        return res.status(400).json({ error: 'Missing endpoint' });
    }

    if (!pushSubscriptions.has(endpoint)) {
        return res.status(404).json({ error: 'Subscription not found' });
    }

    const subData = pushSubscriptions.get(endpoint);
    const initialLength = subData.emergencyContacts?.length || 0;

    subData.emergencyContacts = subData.emergencyContacts?.filter(c => c.id !== contactId) || [];

    if (subData.emergencyContacts.length === initialLength) {
        return res.status(404).json({ error: 'Contact not found' });
    }

    // Reorder priorities
    subData.emergencyContacts.forEach((contact, index) => {
        contact.priority = index + 1;
    });

    saveSubscriptions();

    console.log(`✅ Emergency contact deleted`);

    res.json({
        success: true,
        message: 'Emergency contact deleted successfully'
    });
});

// Test emergency call (manual trigger)
app.post('/api/test-emergency-call', async (req, res) => {
    const { endpoint, contactId } = req.body;

    if (!twilioService) {
        return res.status(503).json({ error: 'Emergency call service not configured' });
    }

    if (!endpoint) {
        return res.status(400).json({ error: 'Missing endpoint' });
    }

    if (!pushSubscriptions.has(endpoint)) {
        return res.status(404).json({ error: 'Subscription not found' });
    }

    const subData = pushSubscriptions.get(endpoint);
    const contact = subData.emergencyContacts?.find(c => c.id === contactId);

    if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
    }

    try {
        // Create test sensor data (high temperature)
        const testData = {
            tempF: 105,
            hum: 50,
            air: 0,
            light: 2000,
            timestamp: new Date().toISOString()
        };

        console.log(`📞 Test call initiated to ${contact.name} (${contact.phone})`);

        const call = await twilioService.makeEmergencyCall(contact.phone, testData.tempF);

        res.json({
            success: true,
            message: 'Test emergency call initiated',
            callSid: call.sid,
            status: call.status,
            mock: call.mock || false,
            contact: {
                name: contact.name,
                phone: contact.phone
            }
        });

    } catch (error) {
        console.error('❌ Test call failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Twilio webhook - Call status updates
app.post('/api/twilio/call-status', (req, res) => {
    const { CallSid, CallStatus, To, From } = req.body;

    console.log(`📞 Twilio Call Status Update:`);
    console.log(`   Call SID: ${CallSid}`);
    console.log(`   Status: ${CallStatus}`);
    console.log(`   From: ${From} → To: ${To}`);

    // You can add logic here to update call history in a database if needed

    res.sendStatus(200);
});

// Make emergency calls to all enabled contacts
async function makeEmergencyCalls(contacts, sensorData) {
    const results = [];

    // Filter to only enabled contacts
    const enabledContacts = contacts.filter(c => c.enabled);

    if (enabledContacts.length === 0) {
        console.log('⚠️  No enabled emergency contacts to call');
        return results;
    }

    console.log(`📞 Calling ${enabledContacts.length} emergency contact(s)...`);

    // Call ALL enabled contacts (simplified approach for beginners)
    for (const contact of enabledContacts) {
        try {
            const call = await twilioService.makeEmergencyCall(
                contact.phone,
                sensorData.tempF
            );

            results.push({
                contactId: contact.id,
                name: contact.name,
                callSid: call.sid,
                status: 'calling',
                mock: call.mock || false
            });

            console.log(`✅ Called ${contact.name} at ${contact.phone}`);

        } catch (error) {
            console.error(`❌ Failed to call ${contact.name}:`, error.message);
            results.push({
                contactId: contact.id,
                name: contact.name,
                error: error.message
            });
        }
    }

    return results;
}

// Check sensor data against thresholds and send alerts
async function checkSensorThresholds(sensorData) {
    if (pushSubscriptions.size === 0) return;

    pushSubscriptions.forEach(async (subData, endpoint) => {
        const { subscription, thresholds, lastAlert, emergencyContacts, lastEmergencyCall } = subData;

        // ==================== EMERGENCY CALL LOGIC (NEW) ====================
        // Check for HIGH TEMPERATURE emergency (100°F or higher)
        const isEmergency = sensorData.tempF >= 100;

        if (isEmergency && emergencyContacts && emergencyContacts.length > 0 && twilioService) {
            // Check 15-minute cooldown (900,000 milliseconds)
            const cooldownPeriod = 15 * 60 * 1000; // 15 minutes
            const canCall = !lastEmergencyCall || (Date.now() - lastEmergencyCall) > cooldownPeriod;

            if (canCall) {
                console.log(`\n🚨 HIGH TEMPERATURE EMERGENCY DETECTED! 🚨`);
                console.log(`   Temperature: ${sensorData.tempF}°F (Threshold: 100°F)`);
                console.log(`   Initiating emergency calls...`);

                try {
                    // Make emergency calls to all enabled contacts
                    const callResults = await makeEmergencyCalls(emergencyContacts, sensorData);

                    // Update last emergency call timestamp
                    subData.lastEmergencyCall = Date.now();
                    saveSubscriptions();

                    console.log(`   Emergency call results:`, callResults);
                    console.log(`   Next emergency call allowed in 15 minutes\n`);

                } catch (error) {
                    console.error(`❌ Error making emergency calls:`, error);
                }
            } else {
                // Still in cooldown period
                const minutesLeft = Math.round((cooldownPeriod - (Date.now() - lastEmergencyCall)) / 60000);
                console.log(`⏱️  Emergency cooldown active: ${minutesLeft} minute(s) remaining`);
            }
        }

        // ==================== NORMAL ALERT LOGIC (EXISTING) ====================
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

