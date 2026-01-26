/**
 * AWS Lambda Function - Push Notification Service
 *
 * This function is triggered by AWS IoT when sensor thresholds are exceeded.
 * It sends web push notifications to subscribed browsers.
 *
 * Triggered by: AWS IoT Rules (separate rules for temp, humidity, air, light)
 * Dependencies: aws-sdk, web-push
 */

const AWS = require('aws-sdk');
const webpush = require('web-push');

// Initialize AWS Services
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Configuration from Environment Variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:akshat@smartweatherstation.com';
const DYNAMODB_TABLE = process.env.PUSH_SUBSCRIPTIONS_TABLE || 'PushSubscriptions';
const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds

// Configure VAPID details
webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

/**
 * Main Lambda Handler
 * @param {Object} event - IoT message + alert type
 * @param {Object} context - Lambda context
 */
exports.handler = async (event, context) => {
    console.log('📊 Received sensor data:', JSON.stringify(event));

    try {
        // Extract sensor data and alert type
        const { tempF, hum, air, light, alertType } = event;

        if (!alertType) {
            console.log('⚠️  No alert type specified');
            return { statusCode: 400, body: 'Missing alert type' };
        }

        console.log(`🔔 Alert type: ${alertType}`);
        console.log(`📊 Sensor data: Temp=${tempF}°F, Hum=${hum}%, Air=${air}, Light=${light}`);

        // Get all push subscriptions from DynamoDB
        const subscriptions = await getAllSubscriptions();

        if (!subscriptions || subscriptions.length === 0) {
            console.log('⚠️  No push subscriptions found');
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No subscriptions to notify' })
            };
        }

        console.log(`📱 Found ${subscriptions.length} subscription(s)`);

        // Process each subscription
        let notificationsSent = 0;
        let notificationsFailed = 0;

        for (const subData of subscriptions) {
            try {
                // Check thresholds and cooldown
                const shouldNotify = await shouldSendNotification(
                    subData,
                    alertType,
                    { tempF, hum, air, light }
                );

                if (!shouldNotify) {
                    continue;
                }

                // Generate alert message
                const alertMessage = generateAlertMessage(alertType, { tempF, hum, air, light }, subData.thresholds);

                // Send push notification
                const payload = JSON.stringify({
                    title: 'Smart Weather Station Alert',
                    body: alertMessage,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: `sws-alert-${alertType}-${Date.now()}`,
                    critical: true,
                    vibrate: [200, 100, 200]
                });

                await webpush.sendNotification(subData.subscription, payload);

                // Update last alert timestamp
                await updateLastAlert(subData.endpoint, alertType);

                notificationsSent++;
                console.log(`✅ Notification sent to ${subData.endpoint.substring(0, 50)}...`);

            } catch (error) {
                notificationsFailed++;
                console.error(`❌ Failed to send notification:`, error.message);

                // Remove invalid subscriptions (expired or unsubscribed)
                if (error.statusCode === 404 || error.statusCode === 410 || error.statusCode === 403) {
                    console.log(`🗑️  Removing invalid subscription: ${subData.endpoint.substring(0, 50)}...`);
                    await removeSubscription(subData.endpoint);
                }
            }
        }

        console.log(`📊 Results: ${notificationsSent} sent, ${notificationsFailed} failed`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Push notifications processed',
                alertType: alertType,
                sent: notificationsSent,
                failed: notificationsFailed
            })
        };

    } catch (error) {
        console.error('❌ Error in Lambda function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
};

/**
 * Get all push subscriptions from DynamoDB
 */
async function getAllSubscriptions() {
    try {
        const params = {
            TableName: DYNAMODB_TABLE
        };

        const result = await dynamodb.scan(params).promise();
        return result.Items || [];

    } catch (error) {
        console.error('❌ Error fetching subscriptions from DynamoDB:', error);
        throw error;
    }
}

/**
 * Check if notification should be sent
 * @param {Object} subData - Subscription data from DynamoDB
 * @param {string} alertType - Type of alert (temp, hum, air, light)
 * @param {Object} sensorData - Current sensor readings
 * @returns {boolean} - True if should send notification
 */
async function shouldSendNotification(subData, alertType, sensorData) {
    // Check if threshold is exceeded
    const thresholds = subData.thresholds || {};
    let thresholdExceeded = false;

    switch (alertType) {
        case 'temp':
            thresholdExceeded = sensorData.tempF > (thresholds.maxTemp || 80);
            break;
        case 'hum':
            thresholdExceeded = sensorData.hum > (thresholds.maxHumidity || 70);
            break;
        case 'air':
            thresholdExceeded = sensorData.air > (thresholds.maxAirQuality || 1000);
            break;
        case 'light':
            thresholdExceeded = sensorData.light < (thresholds.minLight || 100);
            break;
        default:
            return false;
    }

    if (!thresholdExceeded) {
        return false;
    }

    // Check cooldown
    const lastAlert = subData.lastAlert || {};
    const lastAlertTime = lastAlert[alertType];

    if (lastAlertTime) {
        const timeSinceLastAlert = Date.now() - lastAlertTime;
        if (timeSinceLastAlert < COOLDOWN_PERIOD) {
            const minutesLeft = Math.round((COOLDOWN_PERIOD - timeSinceLastAlert) / 60000);
            console.log(`⏱️  ${alertType} alert in cooldown: ${minutesLeft} minute(s) remaining`);
            return false;
        }
    }

    return true;
}

/**
 * Generate alert message based on alert type
 */
function generateAlertMessage(alertType, sensorData, thresholds) {
    const t = thresholds || {};

    switch (alertType) {
        case 'temp':
            return `🌡️ High temperature: ${sensorData.tempF}°F (limit: ${t.maxTemp || 80}°F)`;
        case 'hum':
            return `💧 High humidity: ${sensorData.hum}% (limit: ${t.maxHumidity || 70}%)`;
        case 'air':
            return `💨 Poor air quality: ${sensorData.air} (limit: ${t.maxAirQuality || 1000})`;
        case 'light':
            return `💡 Low light: ${sensorData.light} (limit: ${t.minLight || 100})`;
        default:
            return `⚠️ Sensor alert detected`;
    }
}

/**
 * Update last alert timestamp for a subscription
 */
async function updateLastAlert(endpoint, alertType) {
    try {
        const params = {
            TableName: DYNAMODB_TABLE,
            Key: { endpoint: endpoint },
            UpdateExpression: `SET lastAlert.#alertType = :timestamp`,
            ExpressionAttributeNames: {
                '#alertType': alertType
            },
            ExpressionAttributeValues: {
                ':timestamp': Date.now()
            }
        };

        await dynamodb.update(params).promise();
        console.log(`✅ Updated cooldown for ${alertType}`);

    } catch (error) {
        console.error(`❌ Error updating cooldown:`, error);
    }
}

/**
 * Remove invalid subscription from DynamoDB
 */
async function removeSubscription(endpoint) {
    try {
        const params = {
            TableName: DYNAMODB_TABLE,
            Key: { endpoint: endpoint }
        };

        await dynamodb.delete(params).promise();
        console.log(`✅ Removed invalid subscription`);

    } catch (error) {
        console.error(`❌ Error removing subscription:`, error);
    }
}
