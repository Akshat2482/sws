/**
 * AWS Lambda Function - Push Subscription Management API
 *
 * This function handles push notification subscription management via API Gateway.
 * Endpoints: subscribe, unsubscribe, get-subscriptions, get-vapid-key
 *
 * Triggered by: API Gateway HTTP requests
 * Dependencies: aws-sdk
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Configuration
const DYNAMODB_TABLE = process.env.PUSH_SUBSCRIPTIONS_TABLE || 'PushSubscriptions';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;

/**
 * Main Lambda Handler
 * Routes API Gateway requests to appropriate handlers
 */
exports.handler = async (event, context) => {
    console.log('📨 API Request:', JSON.stringify(event));

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }

    try {
        const path = event.path || event.resource;
        const method = event.httpMethod;

        console.log(`🔀 Route: ${method} ${path}`);

        // Route to appropriate handler
        let result;

        if (path === '/api/vapid-public-key' && method === 'GET') {
            result = await handleGetVapidKey();
        } else if (path === '/api/subscribe' && method === 'POST') {
            result = await handleSubscribe(event);
        } else if (path === '/api/unsubscribe' && method === 'POST') {
            result = await handleUnsubscribe(event);
        } else if (path === '/api/subscriptions' && method === 'GET') {
            result = await handleGetSubscriptions(event);
        } else {
            result = {
                statusCode: 404,
                body: { error: 'Endpoint not found' }
            };
        }

        return {
            statusCode: result.statusCode,
            headers: headers,
            body: typeof result.body === 'string' ? result.body : JSON.stringify(result.body)
        };

    } catch (error) {
        console.error('❌ Error handling request:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
};

/**
 * GET /api/vapid-public-key
 * Returns VAPID public key for push subscription
 */
async function handleGetVapidKey() {
    console.log('🔑 Returning VAPID public key');

    return {
        statusCode: 200,
        body: { publicKey: VAPID_PUBLIC_KEY }
    };
}

/**
 * POST /api/subscribe
 * Subscribe to push notifications
 */
async function handleSubscribe(event) {
    const body = JSON.parse(event.body || '{}');
    const { subscription, thresholds } = body;

    if (!subscription || !subscription.endpoint) {
        return {
            statusCode: 400,
            body: { error: 'Missing subscription data' }
        };
    }

    console.log(`📝 Subscribing: ${subscription.endpoint.substring(0, 50)}...`);

    // Default thresholds if not provided
    const defaultThresholds = {
        maxTemp: 80,
        maxHumidity: 70,
        maxAirQuality: 1000,
        minLight: 100
    };

    // Create subscription item
    const item = {
        endpoint: subscription.endpoint,
        subscription: subscription,
        thresholds: thresholds || defaultThresholds,
        lastAlert: {},
        subscribedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };

    try {
        const params = {
            TableName: DYNAMODB_TABLE,
            Item: item
        };

        await dynamodb.put(params).promise();

        console.log('✅ Subscription saved to DynamoDB');

        return {
            statusCode: 200,
            body: {
                success: true,
                message: 'Subscribed successfully',
                endpoint: subscription.endpoint
            }
        };

    } catch (error) {
        console.error('❌ Error saving subscription:', error);
        throw error;
    }
}

/**
 * POST /api/unsubscribe
 * Unsubscribe from push notifications
 */
async function handleUnsubscribe(event) {
    const body = JSON.parse(event.body || '{}');
    const { endpoint } = body;

    if (!endpoint) {
        return {
            statusCode: 400,
            body: { error: 'Missing endpoint' }
        };
    }

    console.log(`🗑️  Unsubscribing: ${endpoint.substring(0, 50)}...`);

    try {
        const params = {
            TableName: DYNAMODB_TABLE,
            Key: { endpoint: endpoint }
        };

        await dynamodb.delete(params).promise();

        console.log('✅ Subscription removed from DynamoDB');

        return {
            statusCode: 200,
            body: {
                success: true,
                message: 'Unsubscribed successfully'
            }
        };

    } catch (error) {
        console.error('❌ Error removing subscription:', error);
        throw error;
    }
}

/**
 * GET /api/subscriptions?endpoint=xxx
 * Get subscription details (optional: for specific endpoint)
 */
async function handleGetSubscriptions(event) {
    const endpoint = event.queryStringParameters?.endpoint;

    try {
        if (endpoint) {
            // Get specific subscription
            console.log(`🔍 Getting subscription for: ${endpoint.substring(0, 50)}...`);

            const params = {
                TableName: DYNAMODB_TABLE,
                Key: { endpoint: endpoint }
            };

            const result = await dynamodb.get(params).promise();

            if (!result.Item) {
                return {
                    statusCode: 404,
                    body: { error: 'Subscription not found' }
                };
            }

            return {
                statusCode: 200,
                body: {
                    subscription: result.Item.subscription,
                    thresholds: result.Item.thresholds,
                    lastAlert: result.Item.lastAlert,
                    subscribedAt: result.Item.subscribedAt
                }
            };

        } else {
            // Get all subscriptions (count only for privacy)
            console.log('📊 Getting subscription count');

            const params = {
                TableName: DYNAMODB_TABLE,
                Select: 'COUNT'
            };

            const result = await dynamodb.scan(params).promise();

            return {
                statusCode: 200,
                body: {
                    count: result.Count
                }
            };
        }

    } catch (error) {
        console.error('❌ Error fetching subscriptions:', error);
        throw error;
    }
}
